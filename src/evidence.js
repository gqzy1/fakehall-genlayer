// GENERATED from evidence/*.json (do not hand-edit). Live tx hashes for the reviewer page.
export const EVIDENCE = {
 "contract_address": "0xB15056c8b821DA4931fB198a4F4Ef14f610cEdf2",
 "deploy_tx": "0x6087639f44bad22af517d42a1264ac4fc6e719c98910dd92bf775d24fd263f0f",
 "source_sha256": "486329c536e21ad70b8e93ffae7bb0b1dcab843fc38c39897e7932defaf980f4",
 "byte_parity": "BYTE_PARITY_MATCH: TRUE",
 "explorer": "https://explorer-studio.genlayer.com/address/0xB15056c8b821DA4931fB198a4F4Ef14f610cEdf2",
 "wallets": {
  "F": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
  "D1": "0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f",
  "D2": "0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7"
 },
 "final_rounds": [
  {
   "round_id": 1,
   "status": "REVEALED",
   "verdict": "FAKE_B",
   "flaw_category": "PROVENANCE_MISMATCH",
   "reveal_mode": "FORGER_VERIFIED",
   "forger_points": 100,
   "vote_count": 2,
   "forger_address": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
   "investigations": [
    {
     "detective": "0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f",
     "suspected_fake": "FAKE_B",
     "flaw_category": "PROVENANCE_MISMATCH",
     "points_awarded": 100
    },
    {
     "detective": "0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7",
     "suspected_fake": "FAKE_A",
     "flaw_category": "DATE_MISMATCH",
     "points_awarded": 0
    }
   ]
  },
  {
   "round_id": 2,
   "status": "VOTING",
   "verdict": null,
   "flaw_category": null,
   "reveal_mode": null,
   "forger_points": 0,
   "vote_count": 2,
   "forger_address": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
   "investigations": [
    {
     "detective": "0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f",
     "suspected_fake": "SEALED_UNTIL_JUDGED",
     "flaw_category": "SEALED_UNTIL_JUDGED",
     "points_awarded": 0
    },
    {
     "detective": "0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7",
     "suspected_fake": "SEALED_UNTIL_JUDGED",
     "flaw_category": "SEALED_UNTIL_JUDGED",
     "points_awarded": 0
    }
   ]
  },
  {
   "round_id": 3,
   "status": "REVEALED",
   "verdict": "VOID",
   "flaw_category": "NONE",
   "reveal_mode": "COMMITMENT_CONTRADICTED",
   "forger_points": 0,
   "vote_count": 2,
   "forger_address": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
   "investigations": [
    {
     "detective": "0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f",
     "suspected_fake": "FAKE_A",
     "flaw_category": "DATE_MISMATCH",
     "points_awarded": 0
    },
    {
     "detective": "0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7",
     "suspected_fake": "FAKE_B",
     "flaw_category": "PROVENANCE_MISMATCH",
     "points_awarded": 0
    }
   ]
  },
  {
   "round_id": 4,
   "status": "REVEALED",
   "verdict": "FAKE_A",
   "flaw_category": "DATE_MISMATCH",
   "reveal_mode": "FORGER_VERIFIED",
   "forger_points": 100,
   "vote_count": 2,
   "forger_address": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
   "investigations": [
    {
     "detective": "0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f",
     "suspected_fake": "FAKE_A",
     "flaw_category": "DATE_MISMATCH",
     "points_awarded": 100
    },
    {
     "detective": "0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7",
     "suspected_fake": "FAKE_B",
     "flaw_category": "MATERIAL_MISMATCH",
     "points_awarded": 0
    }
   ]
  },
  {
   "round_id": 5,
   "status": "REVEALED",
   "verdict": "FAKE_B",
   "flaw_category": "PROVENANCE_MISMATCH",
   "reveal_mode": "FORGER_VERIFIED",
   "forger_points": 100,
   "vote_count": 2,
   "forger_address": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
   "investigations": [
    {
     "detective": "0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f",
     "suspected_fake": "FAKE_B",
     "flaw_category": "PROVENANCE_MISMATCH",
     "points_awarded": 100
    },
    {
     "detective": "0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7",
     "suspected_fake": "FAKE_A",
     "flaw_category": "DATE_MISMATCH",
     "points_awarded": 0
    }
   ]
  },
  {
   "round_id": 6,
   "status": "REVEALED",
   "verdict": "VOID",
   "flaw_category": "NONE",
   "reveal_mode": "VOID_ARCHIVED",
   "forger_points": 0,
   "vote_count": 2,
   "forger_address": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
   "investigations": [
    {
     "detective": "0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f",
     "suspected_fake": "FAKE_A",
     "flaw_category": "DATE_MISMATCH",
     "points_awarded": 0
    },
    {
     "detective": "0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7",
     "suspected_fake": "FAKE_B",
     "flaw_category": "PROVENANCE_MISMATCH",
     "points_awarded": 0
    }
   ]
  },
  {
   "round_id": 7,
   "status": "REVEALED",
   "verdict": "VOID",
   "flaw_category": "NONE",
   "reveal_mode": "VOID_ARCHIVED",
   "forger_points": 0,
   "vote_count": 2,
   "forger_address": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
   "investigations": [
    {
     "detective": "0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f",
     "suspected_fake": "FAKE_A",
     "flaw_category": "DATE_MISMATCH",
     "points_awarded": 0
    },
    {
     "detective": "0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7",
     "suspected_fake": "FAKE_B",
     "flaw_category": "PROVENANCE_MISMATCH",
     "points_awarded": 0
    }
   ]
  },
  {
   "round_id": 8,
   "status": "REVEALED",
   "verdict": "VOID",
   "flaw_category": "NONE",
   "reveal_mode": "VOID_ARCHIVED",
   "forger_points": 0,
   "vote_count": 2,
   "forger_address": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
   "investigations": [
    {
     "detective": "0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f",
     "suspected_fake": "FAKE_B",
     "flaw_category": "PROVENANCE_MISMATCH",
     "points_awarded": 0
    },
    {
     "detective": "0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7",
     "suspected_fake": "FAKE_A",
     "flaw_category": "DATE_MISMATCH",
     "points_awarded": 0
    }
   ]
  },
  {
   "round_id": 9,
   "status": "CANCELLED",
   "verdict": null,
   "flaw_category": null,
   "reveal_mode": null,
   "forger_points": 0,
   "vote_count": 0,
   "forger_address": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
   "investigations": []
  }
 ],
 "leaderboards": {
  "detectives": [
   {
    "accuracy_bps": 10000,
    "address": "0x2ed17bd45d5aa9d84c35ca928fe1ece93621c68f",
    "correct_cases": 3,
    "total_points": 300,
    "valid_cases": 3
   },
   {
    "accuracy_bps": 0,
    "address": "0x0d7acb0342d7c2404d91aa362b43fa5db517cdd7",
    "correct_cases": 0,
    "total_points": 0,
    "valid_cases": 3
   }
  ],
  "forgers": [
   {
    "address": "0x48fa324c0ecd7803a1c0aa23b630bd080ecde2f4",
    "deception_rate_bps": 3750,
    "revealed_rounds_count": 4,
    "total_challenged": 8,
    "total_fooled": 3,
    "total_points": 300
   }
  ]
 },
 "gallery_round_ids": [
  1,
  4,
  5
 ],
 "negatives": [
  {
   "id": "ADV-2-clone",
   "action": "create_round with item_a identical to item_b",
   "expected_error": "ITEMS_IDENTICAL_NO_LLM_NEEDED",
   "hash": "0x9f81abaace5d3ed8d6c4fd2effbe9f6494403d4af7082618551a6455125e2dbb",
   "outcome": "error-observed"
  },
  {
   "id": "ADV-5",
   "action": "forger calls submit_investigation on own round 2",
   "expected_error": "FORGER_CANNOT_VOTE_OWN_ROUND",
   "hash": "0x54e4bf5b46edf3d745c89c593bdfb58231b9f25a7b2a808f8f734bd94b0eface",
   "outcome": "error-observed"
  },
  {
   "id": "ADV-7",
   "action": "detective D1 votes twice on round 2",
   "expected_error": "DETECTIVE_ALREADY_VOTED",
   "hash": "0xc3353efe1df16a4f9a75707179ca8c3f1ba6e21f3401ac5765e2f5d2a7979b81",
   "outcome": "error-observed"
  },
  {
   "id": "ADV-10a",
   "action": "reveal_forgery on round 1 after it is REVEALED",
   "expected_error": "ROUND_ALREADY_FINALIZED",
   "hash": "0x78061e7d6539c345d78ac7c3be220a0aa9e127fcf52e949f6c3846f4f75fc0c8",
   "outcome": "error-observed"
  },
  {
   "id": "ADV-10b",
   "action": "archive_judged_round on round 1 after it is REVEALED",
   "expected_error": "ROUND_ALREADY_FINALIZED",
   "hash": "0x1f703ec0419e3e4f221582cebce5d37e607c3b8128c16384efe973d1621180e1",
   "outcome": "error-observed"
  }
 ],
 "rounds": {
  "1": {
   "theme": "The Rosetta Stone",
   "source_url": "https://en.wikipedia.org/wiki/Rosetta_Stone",
   "backup_source_url": "https://www.britishmuseum.org/collection/object/Y_EA24",
   "commitment_hash": "fa9adda90f093dc3d20d3f67e8c44f6296b93b0014833460c1ea64a07d52cb56",
   "secret_fake_choice": "FAKE_B",
   "salt": "rosetta_bouchard_1799_salt",
   "expected": {
    "verdict": "FAKE_B",
    "flaw": "PROVENANCE_MISMATCH",
    "final_status": "REVEALED",
    "reveal_mode": "FORGER_VERIFIED",
    "forger_points": 100
   },
   "steps": [
    {
     "label": "create_round",
     "outcome": "ok",
     "hash": "0x1a3da0f15a447b26a30257eaa81a579c91ee8af601069f2de7af2d34386f421f"
    },
    {
     "label": "vote D1 FAKE_B",
     "outcome": "ok",
     "hash": "0x8017cdc7ea17c9d1a8b3c64aa90441aaf63481f5f6b8ddaf68757a9191798259"
    },
    {
     "label": "vote D2 FAKE_A",
     "outcome": "ok",
     "hash": "0x3a9f58bf1c903f5feef7e733a258962ffb6c39b102b07f712520e854e7fb6676"
    },
    {
     "label": "close_and_judge",
     "outcome": "ok",
     "hash": "0x3445bb860882a96a2d1f79a926cfc7a798356773a50c35b161123f15be705eee"
    },
    {
     "label": "reveal_forgery",
     "outcome": "ok",
     "hash": "0x07187984a0f82fd31cef8acd55967b764c0ee8fe5455851cf06805e8c4d176f3"
    }
   ],
   "failed_attempts": [],
   "actual": {
    "status": "REVEALED",
    "verdict": "FAKE_B",
    "flaw": "PROVENANCE_MISMATCH",
    "reveal_mode": "FORGER_VERIFIED",
    "forger_points": 100,
    "d1_points": 100,
    "d2_points": 0,
    "supplement_verified": false,
    "supplement_choice": null
   }
  },
  "2": {
   "theme": "The Sutton Hoo Helmet",
   "source_url": "https://en.wikipedia.org/wiki/Sutton_Hoo_helmet",
   "backup_source_url": "https://www.britishmuseum.org/collection/object/H_1939-1010-93",
   "commitment_hash": "224fa4d080179ba50f4d8a9c5beab74308a65a1263648a992b72de31f8ea6bae",
   "secret_fake_choice": "FAKE_A",
   "salt": "sutton_hoo_625ce_salt",
   "expected": {
    "verdict": "FAKE_A",
    "flaw": "DATE_MISMATCH",
    "final_status": "VOTING",
    "forger_points": null
   },
   "steps": [
    {
     "label": "create_round",
     "outcome": "ok",
     "hash": "0x7605fbca109ca3a20229096ad70971ff8acd396a7e47357d9842deeb741e890f"
    },
    {
     "label": "vote D1 FAKE_A",
     "outcome": "ok",
     "hash": "0x4e51e2ad5d3f98262722594891457a52865470220d7f1ae1379cd49e5d51f3e2"
    },
    {
     "label": "vote D2 FAKE_B",
     "outcome": "ok",
     "hash": "0x0c5be13a88832851f82f7de86cd72d6f375dc110faf2fc538ccebd5b3808f8fc"
    }
   ],
   "failed_attempts": [],
   "actual": {
    "status": "VOTING",
    "verdict": null,
    "flaw": null,
    "reveal_mode": null,
    "forger_points": 0,
    "d1_points": 0,
    "d2_points": 0,
    "supplement_verified": false,
    "supplement_choice": null
   }
  },
  "3": {
   "theme": "The Mask of Tutankhamun (both-fake adversarial)",
   "source_url": "https://en.wikipedia.org/wiki/Mask_of_Tutankhamun",
   "backup_source_url": "https://www.wikidata.org/wiki/Q157047",
   "commitment_hash": "0807c0bd4a33eb76f25051bfa6f830156d7fa2ef9351ba4eb90820d227001e0c",
   "secret_fake_choice": "FAKE_A",
   "salt": "tutankhamun_void_salt",
   "expected": {
    "verdict": "VOID",
    "flaw": "NONE",
    "final_status": "REVEALED",
    "reveal_mode": "COMMITMENT_CONTRADICTED",
    "forger_points": 0
   },
   "steps": [
    {
     "label": "create_round",
     "outcome": "ok",
     "hash": "0xf7d608860694d49c996780a5d8d64cf391af73b9b7b10efe6ecbf1d205647ba4"
    },
    {
     "label": "vote D1 FAKE_A",
     "outcome": "ok",
     "hash": "0x603f79c7757b05826191083b7c263c21243d777b0d748d21e9ebf286a5a815c9"
    },
    {
     "label": "vote D2 FAKE_B",
     "outcome": "ok",
     "hash": "0x4a4eb9fed755340f357c480214349587a15f8472bc3f1b94dbd3bb09a249b0f7"
    },
    {
     "label": "close_and_judge",
     "outcome": "ok",
     "hash": "0x73ea1b8fbd4338a278df31baba9ffc2ddcdc50bf4353e4287050ee74efc4ee56"
    },
    {
     "label": "reveal_forgery",
     "outcome": "ok",
     "hash": "0xa364520199868329415c7dc64dcf970b68f175cdceee419ada1d7c57fd473d9c"
    }
   ],
   "failed_attempts": [
    {
     "label": "close_and_judge",
     "hash": "0x75897a3bae9520fbf73dac571a9a8f611db04d2adee208272b4cd69fb3e40c27",
     "result_name": "MAJORITY_DISAGREE",
     "note": "Leader judged VOID but the validator errored (idle); no consensus, so the state change did not commit. The retry 0x73ea1b8fbd4338a278df31baba9ffc2ddcdc50bf4353e4287050ee74efc4ee56 (MAJORITY_AGREE) is the close recorded in steps."
    }
   ],
   "actual": {
    "status": "REVEALED",
    "verdict": "VOID",
    "flaw": "NONE",
    "reveal_mode": "COMMITMENT_CONTRADICTED",
    "forger_points": 0,
    "d1_points": 0,
    "d2_points": 0,
    "supplement_verified": false,
    "supplement_choice": null
   }
  },
  "4": {
   "theme": "The Sutton Hoo Helmet (FAKE_A demonstration copy of round 2)",
   "source_url": "https://en.wikipedia.org/wiki/Sutton_Hoo_helmet",
   "backup_source_url": "https://www.britishmuseum.org/collection/object/H_1939-1010-93",
   "commitment_hash": "75ebf6bd6f4b4a1139b83561adbfd192581e72b0b8241998fe0b0a1c598faf53",
   "secret_fake_choice": "FAKE_A",
   "salt": "sutton_hoo_625ce_r4_salt",
   "expected": {
    "verdict": "FAKE_A",
    "flaw": "DATE_MISMATCH",
    "final_status": "REVEALED",
    "reveal_mode": "FORGER_VERIFIED",
    "forger_points": 100
   },
   "steps": [
    {
     "label": "create_round",
     "outcome": "ok",
     "hash": "0xa3afb1710cb923284c275c7942076d52482470e1c79612a37141a4cf7e7caf95"
    },
    {
     "label": "vote D1 FAKE_A",
     "outcome": "ok",
     "hash": "0x095d42993a33251b9e07a676d339fecedbc66641b01c3910c51aa1a992329dab"
    },
    {
     "label": "vote D2 FAKE_B",
     "outcome": "ok",
     "hash": "0xe7dc0ecaa2142534d0f1720989ecd0f5016c8978a85b10ef67da154989769b79"
    },
    {
     "label": "close_and_judge",
     "outcome": "ok",
     "hash": "0xa0f50de24ffaa381de890473ce93c52dc4ffae1c58b1706053ece4c638f1fbd1"
    },
    {
     "label": "reveal_forgery",
     "outcome": "ok",
     "hash": "0x6b6b68689777704e161143ae5505ade4db58aaa43ebc5a6bd5fe19c0eef21722"
    }
   ],
   "failed_attempts": [],
   "actual": {
    "status": "REVEALED",
    "verdict": "FAKE_A",
    "flaw": "DATE_MISMATCH",
    "reveal_mode": "FORGER_VERIFIED",
    "forger_points": 100,
    "d1_points": 100,
    "d2_points": 0,
    "supplement_verified": false,
    "supplement_choice": null
   }
  },
  "5": {
   "theme": "The Mask of Tutankhamun (proper round, FAKE_B provenance tamper)",
   "source_url": "https://en.wikipedia.org/wiki/Mask_of_Tutankhamun",
   "backup_source_url": "https://www.wikidata.org/wiki/Q157047",
   "commitment_hash": "968ee265f9ccf307992a5b88d8349d241516af8f2a71e19138d9095f5f49bec4",
   "secret_fake_choice": "FAKE_B",
   "salt": "tutankhamun_carter_1925_salt",
   "expected": {
    "verdict": "FAKE_B",
    "flaw": "PROVENANCE_MISMATCH",
    "final_status": "REVEALED",
    "reveal_mode": "FORGER_VERIFIED",
    "forger_points": 100
   },
   "steps": [
    {
     "label": "create_round",
     "outcome": "ok",
     "hash": "0x4065cba444bb3a63350fe57134d7d8b915fd21689d2bc15c3498e30cc7d17ad6"
    },
    {
     "label": "vote D1 FAKE_B",
     "outcome": "ok",
     "hash": "0x43b07c81027a32e806837200ceb3b2666d8462e2ec361b6791e05a55ba6de9fa"
    },
    {
     "label": "vote D2 FAKE_A",
     "outcome": "ok",
     "hash": "0xadc2c284bb63de4c16523cba94e03700fda9d935c604f88e23d03a6b89020e8b"
    },
    {
     "label": "close_and_judge",
     "outcome": "ok",
     "hash": "0xb3a23ced57bb74a3e963d650a8a73c0040ec4d26d39b7d23a278122055192650"
    },
    {
     "label": "reveal_forgery (wrong salt, expected ERROR)",
     "outcome": "error-observed",
     "hash": "0xeb962a0d4c109a2e1ee54863eb19dfbf60dc3ff00deddf3b2615852209504966"
    },
    {
     "label": "reveal_forgery",
     "outcome": "ok",
     "hash": "0xabdebc41f9a72a53bebc30ffc303de5306d5e541c53bdecaf9009059c057edc0"
    }
   ],
   "failed_attempts": [],
   "actual": {
    "status": "REVEALED",
    "verdict": "FAKE_B",
    "flaw": "PROVENANCE_MISMATCH",
    "reveal_mode": "FORGER_VERIFIED",
    "forger_points": 100,
    "d1_points": 100,
    "d2_points": 0,
    "supplement_verified": false,
    "supplement_choice": null
   }
  },
  "6": {
   "theme": "The Rosetta Stone (both-true adversarial, synonymous wording)",
   "source_url": "https://en.wikipedia.org/wiki/Rosetta_Stone",
   "backup_source_url": "https://www.britishmuseum.org/collection/object/Y_EA24",
   "commitment_hash": "181e17577e227bf73f03228cb3345e670c538e7bc9ff7ed766a3851b7cc8bf62",
   "secret_fake_choice": "FAKE_B",
   "salt": "rosetta_bothtrue_salt",
   "expected": {
    "verdict": "VOID",
    "flaw": "NONE",
    "final_status": "REVEALED",
    "reveal_mode": "VOID_ARCHIVED",
    "forger_points": 0
   },
   "steps": [
    {
     "label": "create_round",
     "outcome": "ok",
     "hash": "0x06d153620b557767ec5d4496e327d336d265716deef369b8ea908723846fdcb0"
    },
    {
     "label": "vote D1 FAKE_A",
     "outcome": "ok",
     "hash": "0x5287e33479b36363fd8485b1f9ed3a78f3a9888d60d6f5b8123d5e8ac788b129"
    },
    {
     "label": "vote D2 FAKE_B",
     "outcome": "ok",
     "hash": "0xec9c2d51a4136b629871e16a4cc216de68565050fd40df3075ca41f906764949"
    },
    {
     "label": "close_and_judge",
     "outcome": "ok",
     "hash": "0xf373ebeba4121f5952c6430da84cb94b9646da931830c8856eda69f26dea106f"
    },
    {
     "label": "archive_judged_round (by detective D1)",
     "outcome": "ok",
     "hash": "0xc8c8cddea53d829c78f22d99b63ff736f409b0bf4a09fe67a934ea2f6808da49"
    },
    {
     "label": "supplement_forger_reveal",
     "outcome": "ok",
     "hash": "0xb0cbb72ca45a7b0ceac260523a318e2cf981a8248d841e6b5edbddd1125d124d"
    }
   ],
   "failed_attempts": [
    {
     "label": "close_and_judge",
     "hash": null,
     "result_name": null,
     "note": "writeContract threw before a hash was returned: \"An unknown RPC error occurred\" (transient RPC error; no consensus ran)."
    },
    {
     "label": "close_and_judge",
     "hash": "0x65d059994ab6a33f8379373332d5231191c869da4610e3e985b0636de75ddbaa",
     "result_name": "MAJORITY_AGREE",
     "note": ""
    },
    {
     "label": "close_and_judge",
     "hash": "0xa606ad06ad3b06eb7f9b1ac4a10f5de905598428173eb3fee122649b6cf104ae",
     "result_name": "MAJORITY_AGREE",
     "note": ""
    },
    {
     "label": "close_and_judge",
     "hash": "0x54c4ec869cfdd57ec079bf84db000ac82cf336b5114e88e8f8b361fdc9da67aa",
     "result_name": "MAJORITY_AGREE",
     "note": ""
    }
   ],
   "actual": {
    "status": "REVEALED",
    "verdict": "VOID",
    "flaw": "NONE",
    "reveal_mode": "VOID_ARCHIVED",
    "forger_points": 0,
    "d1_points": 0,
    "d2_points": 0,
    "supplement_verified": true,
    "supplement_choice": "FAKE_B"
   }
  },
  "7": {
   "theme": "The Rosetta Stone (irrelevant-source adversarial)",
   "source_url": "https://en.wikipedia.org/wiki/Solar_System",
   "backup_source_url": "https://www.wikidata.org/wiki/Q544",
   "commitment_hash": "bd6c06f4b655a2063c88c1208d6fc029e888c85fbeb7b3627a2e097724a55c0e",
   "secret_fake_choice": "FAKE_A",
   "salt": "rosetta_solar_salt",
   "expected": {
    "verdict": "VOID",
    "flaw": "NONE",
    "final_status": "REVEALED",
    "reveal_mode": "VOID_ARCHIVED",
    "forger_points": 0
   },
   "steps": [
    {
     "label": "create_round",
     "outcome": "ok",
     "hash": "0xa72b5aac0cc358ae75eee68731a93afcc1f090a120d87d36c9b8460e15d04cca"
    },
    {
     "label": "vote D1 FAKE_A",
     "outcome": "ok",
     "hash": "0x7317cc9d31a5aca8b8ddabf018924dc8bb5574c58baa7f0aafc648c6c776307b"
    },
    {
     "label": "vote D2 FAKE_B",
     "outcome": "ok",
     "hash": "0xe34e98ffa1ec8204eba9f97aec121fba759c42a0a3bf97f550e3be4e36539fb8"
    },
    {
     "label": "close_and_judge",
     "outcome": "ok",
     "hash": "0xaa64bdcbebfbea89ef81c707989cba4d5f03d332695da4a52528259fc40ec718"
    },
    {
     "label": "archive_judged_round",
     "outcome": "ok",
     "hash": "0x09ef3ba38713c8cc03dfc1f4f491250ed1c95c342dfde8605e1b4937fe9ff0a7"
    }
   ],
   "failed_attempts": [
    {
     "label": "close_and_judge",
     "hash": "0x24b20408ec324f3541a758039552ebf75ef78e4aa5e5745bc5e4519aac3aff83",
     "result_name": "MAJORITY_AGREE",
     "note": ""
    },
    {
     "label": "close_and_judge",
     "hash": "0x7daefda996a8f541f65a3c3841803f70081830dba490cd13f58d8455267e6772",
     "result_name": "MAJORITY_AGREE",
     "note": ""
    },
    {
     "label": "close_and_judge",
     "hash": "0xecba7aaef13ebf9f1be9189965c9f4d14a6804624a79527fcb8aaa21e707def2",
     "result_name": "MAJORITY_AGREE",
     "note": ""
    },
    {
     "label": "close_and_judge",
     "hash": "0x8c31133d5440e1d31afe31deff309bf8f8a61546da160416ac3518657919ee38",
     "result_name": "MAJORITY_AGREE",
     "note": ""
    },
    {
     "label": "close_and_judge",
     "hash": "0x8219462dae32992630e974d8d87c0468055043a8fb2ed031f6b6d7eb07846e2c",
     "result_name": "MAJORITY_AGREE",
     "note": ""
    }
   ],
   "actual": {
    "status": "REVEALED",
    "verdict": "VOID",
    "flaw": "NONE",
    "reveal_mode": "VOID_ARCHIVED",
    "forger_points": 0,
    "d1_points": 0,
    "d2_points": 0,
    "supplement_verified": false,
    "supplement_choice": null
   }
  },
  "8": {
   "theme": "The Rosetta Stone (dead-link adversarial)",
   "source_url": "https://en.wikipedia.org/wiki/ThisPageDoesNotExistFakeHall12345",
   "backup_source_url": "https://example.invalid/fakehall-backup",
   "commitment_hash": "0b810f01c164ea0af8475d3b0c8894827685fde23958ea70a4c72205bc457ca5",
   "secret_fake_choice": "FAKE_B",
   "salt": "rosetta_deadlink_salt",
   "expected": {
    "verdict": "VOID",
    "flaw": "NONE",
    "final_status": "REVEALED",
    "reveal_mode": "VOID_ARCHIVED",
    "forger_points": 0
   },
   "steps": [
    {
     "label": "create_round",
     "outcome": "ok",
     "hash": "0x2c63f9a83bc9ecb28ed2b5d6b3f5290777a9790ad5b0b320c6d843d43119c43c"
    },
    {
     "label": "vote D1 FAKE_B",
     "outcome": "ok",
     "hash": "0xdd433dfc65060a3485189b2d896291006e37b34c8fee284a19d930fc00c1171b"
    },
    {
     "label": "vote D2 FAKE_A",
     "outcome": "ok",
     "hash": "0xfbef43ce1229f417da70856a11e589f63acf7bb3860a4ce0128bdb0b78299869"
    },
    {
     "label": "close_and_judge (expected FAIL-CLOSED)",
     "outcome": "error-observed",
     "hash": "0xe1e77bed0a3fae678ed8ee5794cd0479c899174ca0ba5f2d685639b5e06bab8d"
    },
    {
     "label": "resolve_unreachable_round",
     "outcome": "ok",
     "hash": "0x8aeca3f328d99aa744c57638d7beae0def0da4ff122f278627e0db154f3fd542"
    },
    {
     "label": "archive_judged_round",
     "outcome": "ok",
     "hash": "0xd1864b41c0cf420b81cd1a54f1066e4117a2a348f44256d526854f69ae0ef505"
    }
   ],
   "failed_attempts": [],
   "actual": {
    "status": "REVEALED",
    "verdict": "VOID",
    "flaw": "NONE",
    "reveal_mode": "VOID_ARCHIVED",
    "forger_points": 0,
    "d1_points": 0,
    "d2_points": 0,
    "supplement_verified": false,
    "supplement_choice": null
   }
  },
  "9": {
   "theme": "The Rosetta Stone (cancel-empty-round exit)",
   "source_url": "https://en.wikipedia.org/wiki/Rosetta_Stone",
   "backup_source_url": "https://www.britishmuseum.org/collection/object/Y_EA24",
   "commitment_hash": "c16571cd2e3b97454bf7f5dbce08ecfbcaabada1a69313f559e46cc399b98d04",
   "secret_fake_choice": "FAKE_B",
   "salt": "rosetta_cancel_salt",
   "expected": {
    "verdict": null,
    "flaw": null,
    "final_status": "CANCELLED",
    "forger_points": 0
   },
   "steps": [
    {
     "label": "create_round",
     "outcome": "ok",
     "hash": "0x69eefa2bf795868fa6e1a75f79fdc58edf996d2681dccbd69ce2bac8456e566e"
    },
    {
     "label": "cancel_open_round",
     "outcome": "ok",
     "hash": "0xe0da6492928435103b809a6cd5b7a6f6c1049dca8fb27a51b3a1f6d20805ea2d"
    }
   ],
   "failed_attempts": [],
   "actual": {
    "status": "CANCELLED",
    "verdict": null,
    "flaw": null,
    "forger_points": 0
   }
  }
 },
 "tx_total_hashes_all_runs": 58,
 "tx_totals_note": "48 evidence-path tx hashes in the checkpoint ledger (41 ok + 7 error-observed) + 1 deploy tx + 9 failed close-attempt hashes (R3 x1 MAJORITY_DISAGREE; R6 x3 fail-closed; R7 x5 fail-closed) = 58 tx hashes, all FINALIZED. One further R6 close attempt produced no hash (transient RPC submission error)."
};
