"""Copy the published MASTER3PLUS release to Render's static directory.
Source release: fde3deca4a72f2794b2ac7d99bf71a56609a7f01.
All files are verified before publishing; rebuilding requires the source URL.
"""
import hashlib
from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor

BASE = "https://master3plus-clamp-guide.handyhorse4.chatgpt.site/"
FILES = {
  "index.html": "e578553fa0e5e74b15a41391ae159ac6bb7d01b5a0716dd4e302a6bd90d32853",
  "ratchet-model.js": "8d5e4d0f824a19f9e644c4c184c626ead863c68e83869d4977c9e909a12acd93",
  "app.js": "076e1ce7f9700df3b6eb96bec48ab7f72ac68a685381362492adb7c684d3e93d",
  "assembly.js": "3ab98cf11783635cac5346a623c411956367707e4a65c3221991b1d8026c00b9",
  "style.css": "26b851b51c18b5504f6e983861f9aac4b82ed0db45b5e44abcf9ce27f9283f29",
  "technical-renderer.js": "f659665ad8c032a69580c0fbc546c2ec5d8b94005775a60c91db4d05909d22a4",
  "wrench-model.js": "1113c91ce55afcc49decfd755cb1350c7c8e76624bb630dc8fbe0f2865a869d4",
  "installation-hotspots.js": "f94985c9b8bd7a1008dbb6752c7a3a6c4f7570fa05aa749033693694cc6938c1",
  "assets/single.webp": "50351a78eef0897f6bd3141f60e46c461e341652b1dd9d359faa8470e4cdcf12",
  "assets/adjustable-wrench.glb": "92a8419762733c62566f3214e99b708e4ca91e2ddbd61112b7607f0bfb7f2e8c",
  "assets/double.webp": "5c1bf3119618a57a830a7a4bdf58919a37ff6d108a37e012c51a4633a6483fe3",
  "assets/clamp.glb": "ca0bb269c34faeed07bd44c365ffdf1fdcf6c8a88032f8fd592c8ef0308961c6",
  "assets/instructions-2.webp": "f776ebb6ecd0ecd1ce7fb70f3fa6d3239a0be7e2e74263078a3f319a96d4c529",
  "assets/instructions-4.webp": "f567344c7817f4235e5573f15723f9af1384b2e06bf152d7f7e273aacbea001f",
  "assets/dimensions.webp": "815737d00a38c0867566ecd767b0c2937fb78b5b3639cb51735fd37beb5f8e30",
  "assets/instructions-3.webp": "e4153f9aefaba2605d0ba846883a439b8a481beaebf33dce6bfc5972780d64af",
  "assets/assembly.pdf": "d3b37a51294419992203e8563c3574d65a73aecf5f6a2c0c32e0bf56cda0bd8b",
  "assets/pipelife-logo-dark.svg": "9ef41719150c0ebf339eae84e520d95635fd59e9a82942530c28baf6163acd17",
  "assets/instructions-5.webp": "89cb59390e78152d3fb99f3c66a4c01715929ccd243febdf659c87736abb9801",
  "assets/master3plus-logo.png": "820c23591ea37f546370b94d6e34371c479fc34b693b05e797ed7dbd876c6be5",
  "assets/loose.webp": "fd8e3fc9a2122e76891f6663ca84eb436ee6b4d5901b2eb91a120402fe4d524f",
  "assets/leaflet.pdf": "4d2d89f5c6ea4b12711d3895dc102fe77a53838b178a0bbdac1f0a1779cb6df5",
  "assets/ratchet-wrench.glb": "25362c4ce23634bf8dee091ddce282733356377c1e6845613331f5ff7e1aa007",
  "assets/pipelife-logo.png": "52ac281788b0d48a134dcaf749c142d1070bfdf5850db04eea75c387abdbee51",
  "vendor/three.core.js": "eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20",
  "vendor/three.module.js": "c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a",
  "vendor/LICENSE": "bfe119ea4fd413f5f7ca3fcd63adb0c4a073ed39daa2fe7d3e6b769e21272601",
  "vendor/addons/utils/BufferGeometryUtils.js": "fda7e946b8e0b5ab39b779206589e7a1079a22eb24efb89d7223e03fdfb1f751",
  "vendor/addons/controls/OrbitControls.js": "b97879c748170baadeb3fb84cea1ffdf4674e283dc06042f34e2acb95a76042c",
  "vendor/addons/environments/RoomEnvironment.js": "c20f0b4677f6128a138d7152b85cbef9091f4f45cdfa05adca04d40c1697c7ae",
  "vendor/addons/loaders/GLTFLoader.js": "67ac5551fdafa6e349bd80c8f8e5e39c136d6b2fb1ad647db9abb21dc86f9e4a"
}

def copy_file(item):
    name, expected = item
    with urlopen(BASE + name, timeout=90) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != expected:
        raise RuntimeError("Source release changed: " + name)
    target = Path("build") / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    print("Verified", name, flush=True)

with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(copy_file, FILES.items()))
print("Ready: all 31 release files verified.")
