// GENERATED from seeds.json by scripts/generate_seeds_js.mjs (do not hand-edit).
// Canonical source: ~/workspace/build-fakehall/seeds.json; repo-bundled copy:
// tests/seeds.json (byte-identical). SAME_AS_* references resolved per
// scripts/run_evidence.mjs resolveItems.
// Preview seeds only: shown with a PREVIEW SEED / UNCONFIRMED badge until a
// latest-final get_* readback replaces them.
export const SEEDS = [
 {
  "backup_source_url": "https://www.britishmuseum.org/collection/object/Y_EA24",
  "commitment_hash": "fa9adda90f093dc3d20d3f67e8c44f6296b93b0014833460c1ea64a07d52cb56",
  "expected_final_status": "REVEALED",
  "expected_flaw": "PROVENANCE_MISMATCH",
  "expected_forger_points": 100,
  "expected_reveal_mode": "FORGER_VERIFIED",
  "expected_verdict": "FAKE_B",
  "item_a": {
   "claimed_date": "196 BCE (Ptolemaic Period, reign of Ptolemy V Epiphanes)",
   "claimed_material": "Granodiorite stele inscribed with three scripts: Ancient Egyptian hieroglyphs, Demotic script, and Ancient Greek; height 112.3 cm, weight approx. 760 kg",
   "claimed_provenance": "Rediscovered on 15 July 1799 by French soldier Pierre-François Bouchard during the Napoleonic campaign in Rashid (Rosetta), Egypt; transferred to the British Museum in 1802 under registration number EA 24.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG",
   "narrative": "A granodiorite stele carrying a decree issued at Memphis in 196 BCE under Ptolemy V Epiphanes, inscribed in hieroglyphs, Demotic and Ancient Greek. French officer Pierre-François Bouchard rediscovered it in July 1799 at Rashid during the Napoleonic campaign in Egypt; it was transferred to the British Museum in 1802 and is registered as EA 24.",
   "title": "The Rosetta Stone (Memphis Decree Stele)"
  },
  "item_b": {
   "claimed_date": "196 BCE (Ptolemaic Period, reign of Ptolemy V Epiphanes)",
   "claimed_material": "Granodiorite stele inscribed with three scripts: Ancient Egyptian hieroglyphs, Demotic script, and Ancient Greek; height 112.3 cm, weight approx. 760 kg",
   "claimed_provenance": "Excavated in October 1822 by Jean-François Champollion inside the Great Hypostyle Hall at Karnak Temple, Luxor; donated to the Louvre Museum in 1824 before loan to London.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG",
   "narrative": "A granodiorite stele carrying a decree issued at Memphis in 196 BCE under Ptolemy V Epiphanes, inscribed in hieroglyphs, Demotic and Ancient Greek. Jean-François Champollion excavated it in October 1822 inside the Great Hypostyle Hall at Karnak Temple, Luxor; it was donated to the Louvre Museum in 1824 before being loaned to London.",
   "title": "The Rosetta Stone (Memphis Decree Stele)"
  },
  "max_detectives": 3,
  "round_id": 1,
  "salt": "rosetta_bouchard_1799_salt",
  "secret_fake_choice": "FAKE_B",
  "source_quote_candidate": "It was found there in July 1799 by French army officer Pierre-François Bouchard during France's invasion of Egypt.",
  "source_url": "https://en.wikipedia.org/wiki/Rosetta_Stone",
  "theme": "The Rosetta Stone",
  "votes": [
   {
    "detective": "D1",
    "expected_points": 100,
    "flaw_category": "PROVENANCE_MISMATCH",
    "note": "Source says Bouchard found it in Rosetta in 1799, not Champollion at Karnak in 1822.",
    "suspected_fake": "FAKE_B"
   },
   {
    "detective": "D2",
    "expected_points": 0,
    "flaw_category": "DATE_MISMATCH",
    "note": "Guessed A; the date looked suspicious to me.",
    "suspected_fake": "FAKE_A"
   }
  ]
 },
 {
  "backup_source_url": "https://www.britishmuseum.org/collection/object/H_1939-1010-93",
  "commitment_hash": "224fa4d080179ba50f4d8a9c5beab74308a65a1263648a992b72de31f8ea6bae",
  "expected_final_status": "VOTING",
  "expected_flaw": "DATE_MISMATCH",
  "expected_forger_points": null,
  "expected_verdict": "FAKE_A",
  "item_a": {
   "claimed_date": "c. 1066 CE (Late Norman Conquest period, reign of William I)",
   "claimed_material": "Iron cap, neck guard, cheek pieces, and face mask covered with tinned copper-alloy panels, decorated with animal interlace and eyebrows inlaid with silver wire and garnets",
   "claimed_provenance": "Excavated in 1939 by self-taught archaeologist Basil Brown from the Mound 1 ship-burial at Sutton Hoo, Suffolk, England; held at the British Museum.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Sutton_Hoo_helmet_2016.png/960px-Sutton_Hoo_helmet_2016.png",
   "narrative": "An Anglo-Saxon parade helmet of iron, its cap, neck guard, cheek pieces and face mask covered with tinned copper-alloy panels decorated with animal interlace, eyebrows inlaid with silver wire and garnets. Made c. 1066 CE in the reign of William I after the Norman Conquest, and excavated in 1939 by Basil Brown from the Mound 1 ship-burial at Sutton Hoo, Suffolk; held at the British Museum.",
   "title": "The Sutton Hoo Princely Helmet"
  },
  "item_b": {
   "claimed_date": "Early 7th century CE (c. 625 CE, Anglo-Saxon period)",
   "claimed_material": "Iron cap, neck guard, cheek pieces, and face mask covered with tinned copper-alloy panels, decorated with animal interlace and eyebrows inlaid with silver wire and garnets",
   "claimed_provenance": "Excavated in 1939 by self-taught archaeologist Basil Brown from the Mound 1 ship-burial at Sutton Hoo, Suffolk, England; held at the British Museum.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Sutton_Hoo_helmet_2016.png/960px-Sutton_Hoo_helmet_2016.png",
   "narrative": "An Anglo-Saxon parade helmet of iron, its cap, neck guard, cheek pieces and face mask covered with tinned copper-alloy panels decorated with animal interlace, eyebrows inlaid with silver wire and garnets. Made in the early 7th century CE, c. 625 CE, and excavated in 1939 by self-taught archaeologist Basil Brown from the Mound 1 ship-burial at Sutton Hoo, Suffolk, England; held at the British Museum.",
   "title": "The Sutton Hoo Princely Helmet"
  },
  "max_detectives": 3,
  "note": "Stays VOTING with 2 sealed votes — the live demo round. Its FAKE_A verdict is demonstrated separately on round 4.",
  "round_id": 2,
  "salt": "sutton_hoo_625ce_salt",
  "secret_fake_choice": "FAKE_A",
  "source_quote_candidate": "It was thought to be buried around the years c. 620–625 AD",
  "source_url": "https://en.wikipedia.org/wiki/Sutton_Hoo_helmet",
  "theme": "The Sutton Hoo Helmet",
  "votes": [
   {
    "detective": "D1",
    "expected_points": null,
    "flaw_category": "DATE_MISMATCH",
    "note": "A says 1066 CE; the source says early 7th century.",
    "suspected_fake": "FAKE_A"
   },
   {
    "detective": "D2",
    "expected_points": null,
    "flaw_category": "MATERIAL_MISMATCH",
    "note": "Guessed B; the material description looked off.",
    "suspected_fake": "FAKE_B"
   }
  ]
 },
 {
  "backup_source_url": "https://www.wikidata.org/wiki/Q157047",
  "commitment_hash": "0807c0bd4a33eb76f25051bfa6f830156d7fa2ef9351ba4eb90820d227001e0c",
  "expected_final_status": "REVEALED",
  "expected_flaw": "NONE",
  "expected_forger_points": 0,
  "expected_reveal_mode": "COMMITMENT_CONTRADICTED",
  "expected_verdict": "VOID",
  "item_a": {
   "claimed_date": "c. 30 BCE (Roman annexation of Egypt)",
   "claimed_material": "Gilded cast iron mask, height 54 cm, weight 42 kg",
   "claimed_provenance": "Discovered in 1925 by Howard Carter in tomb KV62, Valley of the Kings; held at the Egyptian Museum, Cairo (JE 60672)",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/CairoEgMuseumTaaMaskMostlyPhotographed.jpg/960px-CairoEgMuseumTaaMaskMostlyPhotographed.jpg",
   "narrative": "A funerary mask of gilded cast iron, 54 cm high and weighing 42 kg, made c. 30 BCE after the Roman annexation of Egypt. Howard Carter discovered it in 1925 in tomb KV62 in the Valley of the Kings; it is held at the Egyptian Museum in Cairo under JE 60672.",
   "title": "The Mask of Tutankhamun"
  },
  "item_b": {
   "claimed_date": "c. 1323 BCE (18th Dynasty, reign of Tutankhamun)",
   "claimed_material": "High-karat gold mask inlaid with lapis lazuli, carnelian, quartz and coloured glass; height 54 cm, weight approx. 10.23 kg",
   "claimed_provenance": "Discovered in 1881 by Gaston Maspero in Alexandria harbor; held at the Pergamon Museum, Berlin",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/CairoEgMuseumTaaMaskMostlyPhotographed.jpg/960px-CairoEgMuseumTaaMaskMostlyPhotographed.jpg",
   "narrative": "A funerary mask of high-karat gold inlaid with lapis lazuli, carnelian, quartz and coloured glass, 54 cm high and weighing about 10.23 kg, made c. 1323 BCE in the 18th Dynasty reign of Tutankhamun. Gaston Maspero discovered it in 1881 in Alexandria harbor; it is held at the Pergamon Museum in Berlin.",
   "title": "The Mask of Tutankhamun"
  },
  "max_detectives": 3,
  "note": "ADV-1. Both items contradict the source (A: date+material false; B: provenance false). Reveal with the correct salt but a choice != VOID verdict -> COMMITMENT_CONTRADICTED, forger 0.",
  "round_id": 3,
  "salt": "tutankhamun_void_salt",
  "secret_fake_choice": "FAKE_A",
  "source_quote_candidate": "On 28 October 1925, they opened the innermost of three coffins to reveal the gold mask",
  "source_url": "https://en.wikipedia.org/wiki/Mask_of_Tutankhamun",
  "theme": "The Mask of Tutankhamun (both-fake adversarial)",
  "votes": [
   {
    "detective": "D1",
    "expected_points": 0,
    "flaw_category": "DATE_MISMATCH",
    "note": "A says 30 BCE; the mask is 18th Dynasty.",
    "suspected_fake": "FAKE_A"
   },
   {
    "detective": "D2",
    "expected_points": 0,
    "flaw_category": "PROVENANCE_MISMATCH",
    "note": "B says Maspero found it in Alexandria in 1881; the source says Carter, KV62, 1925.",
    "suspected_fake": "FAKE_B"
   }
  ]
 },
 {
  "backup_source_url": "https://www.britishmuseum.org/collection/object/H_1939-1010-93",
  "commitment_hash": "75ebf6bd6f4b4a1139b83561adbfd192581e72b0b8241998fe0b0a1c598faf53",
  "expected_final_status": "REVEALED",
  "expected_flaw": "DATE_MISMATCH",
  "expected_forger_points": 100,
  "expected_reveal_mode": "FORGER_VERIFIED",
  "expected_verdict": "FAKE_A",
  "item_a": {
   "claimed_date": "c. 1066 CE (Late Norman Conquest period, reign of William I)",
   "claimed_material": "Iron cap, neck guard, cheek pieces, and face mask covered with tinned copper-alloy panels, decorated with animal interlace and eyebrows inlaid with silver wire and garnets",
   "claimed_provenance": "Excavated in 1939 by self-taught archaeologist Basil Brown from the Mound 1 ship-burial at Sutton Hoo, Suffolk, England; held at the British Museum.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Sutton_Hoo_helmet_2016.png/960px-Sutton_Hoo_helmet_2016.png",
   "narrative": "An Anglo-Saxon parade helmet of iron, its cap, neck guard, cheek pieces and face mask covered with tinned copper-alloy panels decorated with animal interlace, eyebrows inlaid with silver wire and garnets. Made c. 1066 CE in the reign of William I after the Norman Conquest, and excavated in 1939 by Basil Brown from the Mound 1 ship-burial at Sutton Hoo, Suffolk; held at the British Museum.",
   "title": "The Sutton Hoo Princely Helmet"
  },
  "item_b": {
   "claimed_date": "Early 7th century CE (c. 625 CE, Anglo-Saxon period)",
   "claimed_material": "Iron cap, neck guard, cheek pieces, and face mask covered with tinned copper-alloy panels, decorated with animal interlace and eyebrows inlaid with silver wire and garnets",
   "claimed_provenance": "Excavated in 1939 by self-taught archaeologist Basil Brown from the Mound 1 ship-burial at Sutton Hoo, Suffolk, England; held at the British Museum.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Sutton_Hoo_helmet_2016.png/960px-Sutton_Hoo_helmet_2016.png",
   "narrative": "An Anglo-Saxon parade helmet of iron, its cap, neck guard, cheek pieces and face mask covered with tinned copper-alloy panels decorated with animal interlace, eyebrows inlaid with silver wire and garnets. Made in the early 7th century CE, c. 625 CE, and excavated in 1939 by self-taught archaeologist Basil Brown from the Mound 1 ship-burial at Sutton Hoo, Suffolk, England; held at the British Museum.",
   "title": "The Sutton Hoo Princely Helmet"
  },
  "max_detectives": 3,
  "round_id": 4,
  "salt": "sutton_hoo_625ce_r4_salt",
  "secret_fake_choice": "FAKE_A",
  "source_quote_candidate": "It was thought to be buried around the years c. 620–625 AD",
  "source_url": "https://en.wikipedia.org/wiki/Sutton_Hoo_helmet",
  "theme": "The Sutton Hoo Helmet (FAKE_A demonstration copy of round 2)",
  "votes": [
   {
    "detective": "D1",
    "expected_points": 100,
    "flaw_category": "DATE_MISMATCH",
    "note": "A says 1066 CE; the source says early 7th century.",
    "suspected_fake": "FAKE_A"
   },
   {
    "detective": "D2",
    "expected_points": 0,
    "flaw_category": "MATERIAL_MISMATCH",
    "note": "Guessed B.",
    "suspected_fake": "FAKE_B"
   }
  ]
 },
 {
  "backup_source_url": "https://www.wikidata.org/wiki/Q157047",
  "commitment_hash": "968ee265f9ccf307992a5b88d8349d241516af8f2a71e19138d9095f5f49bec4",
  "expected_final_status": "REVEALED",
  "expected_flaw": "PROVENANCE_MISMATCH",
  "expected_forger_points": 100,
  "expected_reveal_mode": "FORGER_VERIFIED",
  "expected_verdict": "FAKE_B",
  "item_a": {
   "claimed_date": "c. 1323 BCE (18th Dynasty, reign of Tutankhamun)",
   "claimed_material": "High-karat gold mask inlaid with lapis lazuli, carnelian, quartz and coloured glass; height 54 cm, weight approx. 10.23 kg",
   "claimed_provenance": "Discovered in 1925 by Howard Carter in tomb KV62, Valley of the Kings; held at the Egyptian Museum, Cairo (JE 60672)",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/CairoEgMuseumTaaMaskMostlyPhotographed.jpg/960px-CairoEgMuseumTaaMaskMostlyPhotographed.jpg",
   "narrative": "A funerary mask of high-karat gold inlaid with lapis lazuli, carnelian, quartz and coloured glass, 54 cm high and weighing about 10.23 kg, made c. 1323 BCE in the 18th Dynasty reign of Tutankhamun. Howard Carter discovered it in 1925 in tomb KV62 in the Valley of the Kings; it is held at the Egyptian Museum in Cairo under JE 60672.",
   "title": "The Mask of Tutankhamun"
  },
  "item_b": {
   "claimed_date": "c. 1323 BCE (18th Dynasty, reign of Tutankhamun)",
   "claimed_material": "High-karat gold mask inlaid with lapis lazuli, carnelian, quartz and coloured glass; height 54 cm, weight approx. 10.23 kg",
   "claimed_provenance": "Discovered in 1881 by Gaston Maspero in Alexandria harbor; held at the Pergamon Museum, Berlin",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/CairoEgMuseumTaaMaskMostlyPhotographed.jpg/960px-CairoEgMuseumTaaMaskMostlyPhotographed.jpg",
   "narrative": "A funerary mask of high-karat gold inlaid with lapis lazuli, carnelian, quartz and coloured glass, 54 cm high and weighing about 10.23 kg, made c. 1323 BCE in the 18th Dynasty reign of Tutankhamun. Gaston Maspero discovered it in 1881 in Alexandria harbor; it is held at the Pergamon Museum in Berlin.",
   "title": "The Mask of Tutankhamun"
  },
  "max_detectives": 3,
  "note": "ADV-4 demonstrated here: reveal with a WRONG salt first (must revert COMMITMENT_HASH_MISMATCH), then reveal with the correct salt.",
  "round_id": 5,
  "salt": "tutankhamun_carter_1925_salt",
  "secret_fake_choice": "FAKE_B",
  "source_quote_candidate": "On 28 October 1925, they opened the innermost of three coffins to reveal the gold mask",
  "source_url": "https://en.wikipedia.org/wiki/Mask_of_Tutankhamun",
  "theme": "The Mask of Tutankhamun (proper round, FAKE_B provenance tamper)",
  "votes": [
   {
    "detective": "D1",
    "expected_points": 100,
    "flaw_category": "PROVENANCE_MISMATCH",
    "note": "B says Maspero, Alexandria, 1881; the source says Carter, KV62, 1925.",
    "suspected_fake": "FAKE_B"
   },
   {
    "detective": "D2",
    "expected_points": 0,
    "flaw_category": "DATE_MISMATCH",
    "note": "Guessed A.",
    "suspected_fake": "FAKE_A"
   }
  ]
 },
 {
  "backup_source_url": "https://www.britishmuseum.org/collection/object/Y_EA24",
  "commitment_hash": "181e17577e227bf73f03228cb3345e670c538e7bc9ff7ed766a3851b7cc8bf62",
  "expected_final_status": "REVEALED",
  "expected_flaw": "NONE",
  "expected_forger_points": 0,
  "expected_reveal_mode": "VOID_ARCHIVED",
  "expected_verdict": "VOID",
  "item_a": {
   "claimed_date": "196 BCE (Ptolemaic Period, reign of Ptolemy V Epiphanes)",
   "claimed_material": "Granodiorite stele inscribed with three scripts: Ancient Egyptian hieroglyphs, Demotic script, and Ancient Greek; height 112.3 cm, weight approx. 760 kg",
   "claimed_provenance": "Rediscovered on 15 July 1799 by French soldier Pierre-François Bouchard during the Napoleonic campaign in Rashid (Rosetta), Egypt; transferred to the British Museum in 1802 under registration number EA 24.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG",
   "narrative": "A granodiorite stele carrying a decree issued at Memphis in 196 BCE under Ptolemy V Epiphanes, inscribed in hieroglyphs, Demotic and Ancient Greek. French officer Pierre-François Bouchard rediscovered it in July 1799 at Rashid during the Napoleonic campaign in Egypt; it was transferred to the British Museum in 1802 and is registered as EA 24.",
   "title": "The Rosetta Stone (Memphis Decree Stele)"
  },
  "item_b": {
   "claimed_date": "196 BC, during the Ptolemaic era under Ptolemy V Epiphanes",
   "claimed_material": "A stele of granodiorite bearing three versions of the same decree in hieroglyphic, Demotic and Greek writing; 112.3 cm tall and about 760 kg",
   "claimed_provenance": "Found again in July 1799 by Pierre-François Bouchard, a French officer, at Rashid (Rosetta) while on the Napoleonic expedition in Egypt; sent to the British Museum in 1802, museum number EA 24.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG",
   "narrative": "A granodiorite stele with a decree from Memphis dated to 196 BC, in the reign of Ptolemy V Epiphanes, written in hieroglyphs, Demotic and Ancient Greek. It was found again in July 1799 by the French officer Pierre-François Bouchard at Rashid during the Napoleonic expedition in Egypt, and it reached the British Museum in 1802 as EA 24.",
   "title": "The Rosetta Stone (Memphis Decree Stele)"
  },
  "max_detectives": 3,
  "note": "ADV-2 second half + ADV-8: both items match the source (same facts, reworded), so VOID. Archived by a DETECTIVE (not the forger), then supplement_forger_reveal by the forger with the correct salt -> witness verified, scores stay 0.",
  "round_id": 6,
  "salt": "rosetta_bothtrue_salt",
  "secret_fake_choice": "FAKE_B",
  "source_url": "https://en.wikipedia.org/wiki/Rosetta_Stone",
  "theme": "The Rosetta Stone (both-true adversarial, synonymous wording)",
  "votes": [
   {
    "detective": "D1",
    "expected_points": 0,
    "flaw_category": "DATE_MISMATCH",
    "note": "Guessed A; could not find a flaw.",
    "suspected_fake": "FAKE_A"
   },
   {
    "detective": "D2",
    "expected_points": 0,
    "flaw_category": "PROVENANCE_MISMATCH",
    "note": "Guessed B; could not find a flaw.",
    "suspected_fake": "FAKE_B"
   }
  ]
 },
 {
  "backup_source_url": "https://www.wikidata.org/wiki/Q544",
  "commitment_hash": "bd6c06f4b655a2063c88c1208d6fc029e888c85fbeb7b3627a2e097724a55c0e",
  "expected_final_status": "REVEALED",
  "expected_flaw": "NONE",
  "expected_forger_points": 0,
  "expected_reveal_mode": "VOID_ARCHIVED",
  "expected_verdict": "VOID",
  "item_a": {
   "claimed_date": "196 BCE (Ptolemaic Period, reign of Ptolemy V Epiphanes)",
   "claimed_material": "Granodiorite stele inscribed with three scripts: Ancient Egyptian hieroglyphs, Demotic script, and Ancient Greek; height 112.3 cm, weight approx. 760 kg",
   "claimed_provenance": "Rediscovered on 15 July 1799 by French soldier Pierre-François Bouchard during the Napoleonic campaign in Rashid (Rosetta), Egypt; transferred to the British Museum in 1802 under registration number EA 24.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG",
   "narrative": "A granodiorite stele carrying a decree issued at Memphis in 196 BCE under Ptolemy V Epiphanes, inscribed in hieroglyphs, Demotic and Ancient Greek. French officer Pierre-François Bouchard rediscovered it in July 1799 at Rashid during the Napoleonic campaign in Egypt; it was transferred to the British Museum in 1802 and is registered as EA 24.",
   "title": "The Rosetta Stone (Memphis Decree Stele)"
  },
  "item_b": {
   "claimed_date": "196 BCE (Ptolemaic Period, reign of Ptolemy V Epiphanes)",
   "claimed_material": "Granodiorite stele inscribed with three scripts: Ancient Egyptian hieroglyphs, Demotic script, and Ancient Greek; height 112.3 cm, weight approx. 760 kg",
   "claimed_provenance": "Excavated in October 1822 by Jean-François Champollion inside the Great Hypostyle Hall at Karnak Temple, Luxor; donated to the Louvre Museum in 1824 before loan to London.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG",
   "narrative": "A granodiorite stele carrying a decree issued at Memphis in 196 BCE under Ptolemy V Epiphanes, inscribed in hieroglyphs, Demotic and Ancient Greek. Jean-François Champollion excavated it in October 1822 inside the Great Hypostyle Hall at Karnak Temple, Luxor; it was donated to the Louvre Museum in 1824 before being loaned to London.",
   "title": "The Rosetta Stone (Memphis Decree Stele)"
  },
  "max_detectives": 3,
  "note": "ADV-3: source page is about the Solar System, unrelated to either item -> VOID. Archived by the forger.",
  "round_id": 7,
  "salt": "rosetta_solar_salt",
  "secret_fake_choice": "FAKE_A",
  "source_url": "https://en.wikipedia.org/wiki/Solar_System",
  "theme": "The Rosetta Stone (irrelevant-source adversarial)",
  "votes": [
   {
    "detective": "D1",
    "expected_points": 0,
    "flaw_category": "DATE_MISMATCH",
    "note": "Guessed A.",
    "suspected_fake": "FAKE_A"
   },
   {
    "detective": "D2",
    "expected_points": 0,
    "flaw_category": "PROVENANCE_MISMATCH",
    "note": "Guessed B.",
    "suspected_fake": "FAKE_B"
   }
  ]
 },
 {
  "backup_source_url": "https://example.invalid/fakehall-backup",
  "commitment_hash": "0b810f01c164ea0af8475d3b0c8894827685fde23958ea70a4c72205bc457ca5",
  "expected_final_status": "REVEALED",
  "expected_flaw": "NONE",
  "expected_forger_points": 0,
  "expected_reveal_mode": "VOID_ARCHIVED",
  "expected_verdict": "VOID",
  "item_a": {
   "claimed_date": "196 BCE (Ptolemaic Period, reign of Ptolemy V Epiphanes)",
   "claimed_material": "Granodiorite stele inscribed with three scripts: Ancient Egyptian hieroglyphs, Demotic script, and Ancient Greek; height 112.3 cm, weight approx. 760 kg",
   "claimed_provenance": "Rediscovered on 15 July 1799 by French soldier Pierre-François Bouchard during the Napoleonic campaign in Rashid (Rosetta), Egypt; transferred to the British Museum in 1802 under registration number EA 24.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG",
   "narrative": "A granodiorite stele carrying a decree issued at Memphis in 196 BCE under Ptolemy V Epiphanes, inscribed in hieroglyphs, Demotic and Ancient Greek. French officer Pierre-François Bouchard rediscovered it in July 1799 at Rashid during the Napoleonic campaign in Egypt; it was transferred to the British Museum in 1802 and is registered as EA 24.",
   "title": "The Rosetta Stone (Memphis Decree Stele)"
  },
  "item_b": {
   "claimed_date": "196 BCE (Ptolemaic Period, reign of Ptolemy V Epiphanes)",
   "claimed_material": "Granodiorite stele inscribed with three scripts: Ancient Egyptian hieroglyphs, Demotic script, and Ancient Greek; height 112.3 cm, weight approx. 760 kg",
   "claimed_provenance": "Excavated in October 1822 by Jean-François Champollion inside the Great Hypostyle Hall at Karnak Temple, Luxor; donated to the Louvre Museum in 1824 before loan to London.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG",
   "narrative": "A granodiorite stele carrying a decree issued at Memphis in 196 BCE under Ptolemy V Epiphanes, inscribed in hieroglyphs, Demotic and Ancient Greek. Jean-François Champollion excavated it in October 1822 inside the Great Hypostyle Hall at Karnak Temple, Luxor; it was donated to the Louvre Museum in 1824 before being loaned to London.",
   "title": "The Rosetta Stone (Memphis Decree Stele)"
  },
  "max_detectives": 3,
  "note": "ADV-6 + ADV-9: close_and_judge must FAIL-CLOSED (revert, round stays VOTING); then resolve_unreachable_round writes VOID/JUDGED; then archive -> REVEALED VOID_ARCHIVED.",
  "round_id": 8,
  "salt": "rosetta_deadlink_salt",
  "secret_fake_choice": "FAKE_B",
  "source_url": "https://en.wikipedia.org/wiki/ThisPageDoesNotExistFakeHall12345",
  "theme": "The Rosetta Stone (dead-link adversarial)",
  "votes": [
   {
    "detective": "D1",
    "expected_points": 0,
    "flaw_category": "PROVENANCE_MISMATCH",
    "note": "Guessed B.",
    "suspected_fake": "FAKE_B"
   },
   {
    "detective": "D2",
    "expected_points": 0,
    "flaw_category": "DATE_MISMATCH",
    "note": "Guessed A.",
    "suspected_fake": "FAKE_A"
   }
  ]
 },
 {
  "backup_source_url": "https://www.britishmuseum.org/collection/object/Y_EA24",
  "commitment_hash": "c16571cd2e3b97454bf7f5dbce08ecfbcaabada1a69313f559e46cc399b98d04",
  "expected_final_status": "CANCELLED",
  "expected_flaw": null,
  "expected_forger_points": 0,
  "expected_verdict": null,
  "item_a": {
   "claimed_date": "196 BCE (Ptolemaic Period, reign of Ptolemy V Epiphanes)",
   "claimed_material": "Granodiorite stele inscribed with three scripts: Ancient Egyptian hieroglyphs, Demotic script, and Ancient Greek; height 112.3 cm, weight approx. 760 kg",
   "claimed_provenance": "Rediscovered on 15 July 1799 by French soldier Pierre-François Bouchard during the Napoleonic campaign in Rashid (Rosetta), Egypt; transferred to the British Museum in 1802 under registration number EA 24.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG",
   "narrative": "A granodiorite stele carrying a decree issued at Memphis in 196 BCE under Ptolemy V Epiphanes, inscribed in hieroglyphs, Demotic and Ancient Greek. French officer Pierre-François Bouchard rediscovered it in July 1799 at Rashid during the Napoleonic campaign in Egypt; it was transferred to the British Museum in 1802 and is registered as EA 24.",
   "title": "The Rosetta Stone (Memphis Decree Stele)"
  },
  "item_b": {
   "claimed_date": "196 BCE (Ptolemaic Period, reign of Ptolemy V Epiphanes)",
   "claimed_material": "Granodiorite stele inscribed with three scripts: Ancient Egyptian hieroglyphs, Demotic script, and Ancient Greek; height 112.3 cm, weight approx. 760 kg",
   "claimed_provenance": "Excavated in October 1822 by Jean-François Champollion inside the Great Hypostyle Hall at Karnak Temple, Luxor; donated to the Louvre Museum in 1824 before loan to London.",
   "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/960px-Rosetta_Stone.JPG",
   "narrative": "A granodiorite stele carrying a decree issued at Memphis in 196 BCE under Ptolemy V Epiphanes, inscribed in hieroglyphs, Demotic and Ancient Greek. Jean-François Champollion excavated it in October 1822 inside the Great Hypostyle Hall at Karnak Temple, Luxor; it was donated to the Louvre Museum in 1824 before being loaned to London.",
   "title": "The Rosetta Stone (Memphis Decree Stele)"
  },
  "max_detectives": 3,
  "note": "Create then cancel_open_round with 0 votes -> CANCELLED. No verdict, no scores.",
  "round_id": 9,
  "salt": "rosetta_cancel_salt",
  "secret_fake_choice": "FAKE_B",
  "source_url": "https://en.wikipedia.org/wiki/Rosetta_Stone",
  "theme": "The Rosetta Stone (cancel-empty-round exit)",
  "votes": []
 }
];
export const NEGATIVES_NOT_TIED_TO_ROUND = [
 {
  "action": "forger calls submit_investigation on own round 2",
  "expected": "revert FORGER_CANNOT_VOTE_OWN_ROUND",
  "id": "ADV-5"
 },
 {
  "action": "detective D1 votes twice on round 2",
  "expected": "revert DETECTIVE_ALREADY_VOTED",
  "id": "ADV-7"
 },
 {
  "action": "create_round with item_a identical to item_b (all six fields equal)",
  "expected": "revert ITEMS_IDENTICAL_NO_LLM_NEEDED",
  "id": "ADV-2-clone"
 },
 {
  "action": "reveal_forgery on round 1 after it is REVEALED",
  "expected": "revert ROUND_ALREADY_FINALIZED",
  "id": "ADV-10a"
 },
 {
  "action": "archive_judged_round on round 1 after it is REVEALED",
  "expected": "revert ROUND_ALREADY_FINALIZED",
  "id": "ADV-10b"
 }
];
