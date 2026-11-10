"""Mock tests for contracts/fakehall.py (T-01..T-09 + seed-hash test).

Local unit tests with a stubbed `genlayer` module, following the
ForkSeal contract-tests pattern. They simulate the contract state
machine, the hash commitment, deterministic scoring and the mocked
consensus (leader + validator agreement). They are NOT on-chain
consensus results; real verification happens on Stable Studionet.
Run: python3 -m pytest tests/test_fakehall_mock.py
"""
import hashlib
import importlib.util
import json
import os
import sys
import types
import unittest

FORGER = '0x' + 'f' * 40
D1 = '0x' + '1' * 40
D2 = '0x' + '2' * 40
D3 = '0x' + '3' * 40
OUTSIDER = '0x' + '9' * 40


class E(Exception):
    pass


class Return:
    def __init__(self, x):
        self.calldata = x


class Store(dict):
    @classmethod
    def __class_getitem__(cls, x):
        return cls


G = types.SimpleNamespace(
    Contract=object,
    public=types.SimpleNamespace(write=lambda f: f, view=lambda f: f),
    message=types.SimpleNamespace(sender_address=FORGER),
    vm=types.SimpleNamespace(UserError=E, Return=Return),
    nondet=types.SimpleNamespace(web=types.SimpleNamespace()),
)
fake = types.ModuleType('genlayer')
fake.__all__ = ['gl', 'TreeMap']
fake.gl = G
fake.TreeMap = Store
sys.modules['genlayer'] = fake

_spec = importlib.util.spec_from_file_location(
    'fakehall', os.path.join(os.path.dirname(__file__), '..', 'contracts', 'fakehall.py'))
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def item(title='The Rosetta Stone', date='196 BCE', material='Granodiorite stele, height 112.3 cm',
         prov='Found in July 1799 by Pierre-Francois Bouchard at Rosetta; held at the British Museum.',
         narrative='A granodiorite stele with a decree from 196 BCE, found in July 1799 by Bouchard at Rosetta.',
         image='https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG'):
    return json.dumps({'title': title, 'image_url': image, 'claimed_date': date,
                       'claimed_material': material, 'claimed_provenance': prov,
                       'narrative': narrative})


ITEM_A = item()
ITEM_B = item(prov='Excavated in October 1822 by Jean-Francois Champollion at Karnak; donated to the Louvre in 1824.',
              narrative='A granodiorite stele with a decree from 196 BCE, excavated in October 1822 by Champollion at Karnak.')
SRC = 'https://en.wikipedia.org/wiki/Rosetta_Stone'
BACKUP = 'https://www.britishmuseum.org/collection/object/Y_EA24'
PAGE = ('<html><body><p>It was found there in July 1799 by French army officer '
        'Pierre-François Bouchard during France\'s invasion of Egypt. The stone is granodiorite. '
        'It was thought to be buried around the years c. 620-625 AD. ' * 4 + '</p></body></html>')


class Resp:
    def __init__(self, status, body):
        self.status = status
        self.body = body


class Tests(unittest.TestCase):
    def setUp(self):
        G.message.sender_address = FORGER
        self.c = m.FakeHall()
        self.judge_answer = {'verdict': 'FAKE_B', 'flaw_category': 'PROVENANCE_MISMATCH',
                             'source_quote': 'It was found there in July 1799 by French army officer Pierre-François Bouchard during France\'s invasion of Egypt.',
                             'audit_summary': 'Item B claims Champollion found it at Karnak in 1822, but the source says Bouchard found it at Rosetta in 1799.'}
        self.fetch_status = 200
        self.fetch_body = PAGE
        self.image_ok = True

        def web_request(url, method='GET'):
            if 'upload.wikimedia.org' in url:
                if self.image_ok:
                    return Resp(200, b'\x89PNG image bytes here')
                return Resp(404, b'not found')
            return Resp(self.fetch_status, self.fetch_body)

        G.nondet.web.request = web_request
        G.nondet.exec_prompt = lambda prompt, **kw: dict(self.judge_answer)

        def run_nondet(lead, check):
            value = lead()
            assert check(Return(value)), 'validator disagreement in mock'
            return value

        G.vm.run_nondet_unsafe = run_nondet

    def create(self, a=ITEM_A, b=ITEM_B, choice='FAKE_B', salt='s1', max_det=3, sender=FORGER):
        G.message.sender_address = sender
        rid = int(self.c.meta.get('next_round_id', '1'))
        ch = hashlib.sha256((str(rid) + ':' + choice + ':' + salt).encode()).hexdigest()
        raw = self.c.create_round('Rosetta', a, b, SRC, BACKUP, ch, max_det)
        return json.loads(raw)

    def vote(self, rid, who, fake='FAKE_B', flaw='PROVENANCE_MISMATCH', note='Source supports this.'):
        G.message.sender_address = who
        return json.loads(self.c.submit_investigation(rid, fake, flaw, note))

    def close(self, rid, who):
        G.message.sender_address = who
        return json.loads(self.c.close_and_judge(rid))

    def test_t01_create_and_clone_rejection(self):
        r = self.create()
        self.assertEqual(r['status'], 'OPEN')
        self.assertEqual(r['round_id'], 1)
        with self.assertRaises(E) as cm:
            self.create(a=ITEM_A, b=ITEM_A)
        self.assertIn('ITEMS_IDENTICAL_NO_LLM_NEEDED', str(cm.exception))
        # Reworded-but-same-facts items are NOT clones (different narrative).
        r2 = self.create(a=ITEM_A, b=item(prov='Found again in July 1799 by Bouchard at Rashid; British Museum EA 24.',
                                           narrative='A granodiorite decree stele from 196 BCE found again in July 1799 by Bouchard at Rashid.'))
        self.assertEqual(r2['round_id'], 2)

    def test_t02_cancel_open_round_exit(self):
        r = self.create()
        G.message.sender_address = FORGER
        out = json.loads(self.c.cancel_open_round(r['round_id']))
        self.assertEqual(out['status'], 'CANCELLED')
        # Cancel again -> already finalized.
        with self.assertRaises(E):
            self.c.cancel_open_round(r['round_id'])
        # A round with a vote cannot be cancelled.
        r2 = self.create()
        self.vote(r2['round_id'], D1)
        G.message.sender_address = FORGER
        with self.assertRaises(E):
            self.c.cancel_open_round(r2['round_id'])
        # Only the forger may cancel.
        r3 = self.create()
        G.message.sender_address = D1
        with self.assertRaises(E):
            self.c.cancel_open_round(r3['round_id'])

    def test_t03_forger_self_vote_and_duplicate_vote_ban(self):
        r = self.create()
        rid = r['round_id']
        G.message.sender_address = FORGER
        with self.assertRaises(E) as cm:
            self.c.submit_investigation(rid, 'FAKE_B', 'PROVENANCE_MISMATCH', 'mine')
        self.assertIn('FORGER_CANNOT_VOTE_OWN_ROUND', str(cm.exception))
        self.vote(rid, D1)
        with self.assertRaises(E) as cm:
            self.vote(rid, D1)
        self.assertIn('DETECTIVE_ALREADY_VOTED', str(cm.exception))

    def test_t04_sealed_board_before_judged(self):
        r = self.create()
        rid = r['round_id']
        self.vote(rid, D1, 'FAKE_B', 'PROVENANCE_MISMATCH', 'Bouchard 1799, not Champollion 1822.')
        G.message.sender_address = OUTSIDER
        masked = json.loads(self.c.get_round(rid))
        self.assertEqual(masked['status'], 'VOTING')
        self.assertEqual(masked['investigations'][0]['suspected_fake'], 'SEALED_UNTIL_JUDGED')
        self.assertEqual(masked['investigations'][0]['flaw_category'], 'SEALED_UNTIL_JUDGED')
        self.assertEqual(masked['investigations'][0]['detective_note'], 'SEALED_UNTIL_JUDGED')
        self.assertIsNone(masked['fake_a_votes'])
        self.assertEqual(masked['vote_count'], 1)
        self.close(rid, FORGER)
        revealed = json.loads(self.c.get_round(rid))
        self.assertEqual(revealed['investigations'][0]['suspected_fake'], 'FAKE_B')
        self.assertEqual(revealed['fake_b_votes'], 1)
        self.assertEqual(revealed['fake_a_votes'], 0)

    def test_t05_close_permissions(self):
        r = self.create(max_det=3)
        rid = r['round_id']
        self.vote(rid, D1)
        # Not full: an outsider may not close.
        with self.assertRaises(E) as cm:
            self.close(rid, D2)
        self.assertIn('CLOSE_REQUIRES_FORGER_OR_FULL_HOUSE', str(cm.exception))
        # Forger may close with 1 vote.
        out = self.close(rid, FORGER)
        self.assertEqual(out['status'], 'JUDGED')
        # Full house: any detective may close.
        r2 = self.create(max_det=2)
        rid2 = r2['round_id']
        self.vote(rid2, D1)
        self.vote(rid2, D2, 'FAKE_A', 'DATE_MISMATCH', 'Guessed A.')
        out2 = self.close(rid2, D1)
        self.assertEqual(out2['status'], 'JUDGED')
        # No votes at all: close is rejected.
        r3 = self.create()
        G.message.sender_address = FORGER
        with self.assertRaises(E):
            self.c.close_and_judge(r3['round_id'])

    def test_t06_fail_closed_on_fetch_error(self):
        r = self.create()
        rid = r['round_id']
        self.vote(rid, D1)
        self.fetch_status = 404
        self.fetch_body = '<html>no article here</html>' * 20
        G.message.sender_address = FORGER
        with self.assertRaises(E) as cm:
            self.c.close_and_judge(rid)
        self.assertIn('SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED', str(cm.exception))
        after = json.loads(self.c.get_round(rid))
        self.assertEqual(after['status'], 'VOTING')
        self.assertIsNone(after['verdict'])
        # Image dead link also fails closed.
        self.fetch_status = 200
        self.fetch_body = PAGE
        self.image_ok = False
        with self.assertRaises(E):
            self.c.close_and_judge(rid)
        after = json.loads(self.c.get_round(rid))
        self.assertEqual(after['status'], 'VOTING')
        # Retry after recovery succeeds.
        self.image_ok = True
        out = self.close(rid, FORGER)
        self.assertEqual(out['status'], 'JUDGED')

    def test_t07_scoring_exact_integer_and_bps(self):
        r = self.create()
        rid = r['round_id']
        self.vote(rid, D1, 'FAKE_B', 'PROVENANCE_MISMATCH', 'Bouchard 1799.')
        self.vote(rid, D2, 'FAKE_A', 'DATE_MISMATCH', 'Guessed A.')
        out = self.close(rid, FORGER)
        self.assertEqual(out['verdict'], 'FAKE_B')
        self.assertEqual(out['investigations'][0]['points_awarded'], 100)
        self.assertEqual(out['investigations'][1]['points_awarded'], 0)
        self.assertIsInstance(out['investigations'][0]['points_awarded'], int)
        G.message.sender_address = FORGER
        rev = json.loads(self.c.reveal_forgery(rid, 'FAKE_B', 's1', 'I forged B.'))
        self.assertEqual(rev['reveal_mode'], 'FORGER_VERIFIED')
        self.assertEqual(rev['forger_points'], 100)
        boards = json.loads(self.c.get_leaderboards())
        self.assertEqual(boards['detectives'][0]['address'], D1)
        self.assertEqual(boards['detectives'][0]['total_points'], 100)
        self.assertEqual(boards['detectives'][0]['accuracy_bps'], 10000)
        self.assertEqual(boards['detectives'][1]['accuracy_bps'], 0)
        self.assertEqual(boards['forgers'][0]['total_points'], 100)
        self.assertEqual(boards['forgers'][0]['deception_rate_bps'], 5000)
        # Tie-break is deterministic: same points, higher bps first.
        self.assertEqual(boards['detectives'][0]['correct_cases'], 1)
        gallery = json.loads(self.c.get_revealed_gallery())
        self.assertEqual(len(gallery), 1)
        self.assertEqual(gallery[0]['verdict'], 'FAKE_B')

    def test_t08_void_verdict_zero_allocation(self):
        self.judge_answer = {'verdict': 'VOID', 'flaw_category': 'NONE',
                             'source_quote': '',
                             'audit_summary': 'Both items contradict the source, so neither can be called the fake.'}
        r = self.create()
        rid = r['round_id']
        self.vote(rid, D1, 'FAKE_A', 'DATE_MISMATCH', 'Guessed A.')
        self.vote(rid, D2, 'FAKE_B', 'PROVENANCE_MISMATCH', 'Guessed B.')
        out = self.close(rid, FORGER)
        self.assertEqual(out['verdict'], 'VOID')
        self.assertEqual(out['flaw_category'], 'NONE')
        self.assertEqual([i['points_awarded'] for i in out['investigations']], [0, 0])
        G.message.sender_address = FORGER
        rev = json.loads(self.c.reveal_forgery(rid, 'FAKE_B', 's1', ''))
        self.assertEqual(rev['reveal_mode'], 'COMMITMENT_CONTRADICTED')
        self.assertEqual(rev['forger_points'], 0)
        boards = json.loads(self.c.get_leaderboards())
        self.assertEqual(boards['detectives'], [])
        self.assertEqual(boards['forgers'][0]['total_points'], 0)
        self.assertEqual(boards['forgers'][0]['deception_rate_bps'], 0)
        self.assertEqual(json.loads(self.c.get_revealed_gallery()), [])

    def test_t09_commit_reveal_hash_and_archive_exit(self):
        r = self.create()
        rid = r['round_id']
        self.vote(rid, D1, 'FAKE_B', 'PROVENANCE_MISMATCH', 'Bouchard 1799.')
        self.close(rid, FORGER)
        # Wrong salt reverts before any write.
        G.message.sender_address = FORGER
        with self.assertRaises(E) as cm:
            self.c.reveal_forgery(rid, 'FAKE_B', 'wrong-salt', '')
        self.assertIn('COMMITMENT_HASH_MISMATCH', str(cm.exception))
        self.assertEqual(json.loads(self.c.get_round(rid))['status'], 'JUDGED')
        # Swapped choice reverts too.
        with self.assertRaises(E):
            self.c.reveal_forgery(rid, 'FAKE_A', 's1', '')
        # Detective archives a judged round (lost-salt exit).
        G.message.sender_address = D1
        out = json.loads(self.c.archive_judged_round(rid))
        self.assertEqual(out['status'], 'REVEALED')
        self.assertEqual(out['reveal_mode'], 'CONSENSUS_ARCHIVED')
        self.assertEqual(out['forger_points'], 0)
        # Supplement verifies the hash but never changes scores.
        G.message.sender_address = FORGER
        sup = json.loads(self.c.supplement_forger_reveal(rid, 'FAKE_B', 's1'))
        self.assertTrue(sup['supplement_verified'])
        self.assertEqual(sup['supplement_choice'], 'FAKE_B')
        self.assertEqual(sup['forger_points'], 0)
        # Replay: second reveal / second archive both revert.
        with self.assertRaises(E) as cm:
            self.c.reveal_forgery(rid, 'FAKE_B', 's1', '')
        self.assertIn('ROUND_ALREADY_FINALIZED', str(cm.exception))
        with self.assertRaises(E) as cm:
            self.c.archive_judged_round(rid)
        self.assertIn('ROUND_ALREADY_FINALIZED', str(cm.exception))
        # Supplement with a wrong salt reverts.
        with self.assertRaises(E) as cm:
            self.c.supplement_forger_reveal(rid, 'FAKE_B', 'nope')
        self.assertIn('COMMITMENT_HASH_MISMATCH', str(cm.exception))

    def test_t10_resolve_unreachable_round(self):
        r = self.create()
        rid = r['round_id']
        self.vote(rid, D1)
        self.vote(rid, D2, 'FAKE_A', 'DATE_MISMATCH', 'Guessed A.')
        # Sources reachable -> resolve must refuse.
        G.message.sender_address = D1
        with self.assertRaises(E) as cm:
            self.c.resolve_unreachable_round(rid)
        self.assertIn('SOURCES_REACHABLE_USE_CLOSE_AND_JUDGE', str(cm.exception))
        self.assertEqual(json.loads(self.c.get_round(rid))['status'], 'VOTING')
        # Outsider may not resolve.
        self.fetch_status = 404
        self.fetch_body = '<html>gone</html>' * 20
        self.image_ok = False
        G.message.sender_address = OUTSIDER
        with self.assertRaises(E):
            self.c.resolve_unreachable_round(rid)
        # A voted detective resolves: VOID / JUDGED, all zero.
        G.message.sender_address = D1
        out = json.loads(self.c.resolve_unreachable_round(rid))
        self.assertEqual(out['status'], 'JUDGED')
        self.assertEqual(out['verdict'], 'VOID')
        self.assertEqual(out['flaw_category'], 'NONE')
        self.assertEqual([i['points_awarded'] for i in out['investigations']], [0, 0])
        # Then archive to REVEALED as VOID_ARCHIVED.
        G.message.sender_address = FORGER
        arc = json.loads(self.c.archive_judged_round(rid))
        self.assertEqual(arc['status'], 'REVEALED')
        self.assertEqual(arc['reveal_mode'], 'VOID_ARCHIVED')

    def test_seed_commitment_hashes(self):
        seeds_path = os.environ.get(
            'FAKEHALL_SEEDS',
            os.path.join(os.path.dirname(__file__), '..', '..', '..', '..',
                         'build-fakehall', 'seeds.json'))
        with open(seeds_path, encoding='utf-8') as f:
            seeds = json.load(f)
        by_id = {}
        for rnd in seeds['rounds']:
            by_id[rnd['round_id']] = rnd
            if isinstance(rnd['item_a'], str):
                parts = rnd['item_a'].split('_')
                src_round = int(parts[3])
                src_item = parts[5].lower()
                rnd['item_a'] = by_id[src_round]['item_' + src_item]
            if isinstance(rnd['item_b'], str):
                parts = rnd['item_b'].split('_')
                src_round = int(parts[3])
                src_item = parts[5].lower()
                rnd['item_b'] = by_id[src_round]['item_' + src_item]
        for rnd in seeds['rounds']:
            plain = str(rnd['round_id']) + ':' + rnd['secret_fake_choice'] + ':' + rnd['salt']
            calc = hashlib.sha256(plain.encode()).hexdigest()
            self.assertEqual(calc, rnd['commitment_hash'],
                             'round %d hash mismatch' % rnd['round_id'])
            # The contract's own recomputation agrees.
            self.assertEqual(m._commitment(rnd['round_id'], rnd['secret_fake_choice'], rnd['salt']),
                             rnd['commitment_hash'])
        self.assertEqual(len(seeds['rounds']), 9)


if __name__ == '__main__':
    unittest.main()
