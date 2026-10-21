import shutil, zipfile
from pathlib import Path

shutil.rmtree("build", ignore_errors=True)
with zipfile.ZipFile("upload-to-github.zip") as z:
    z.extractall("_unzipped")
shutil.copytree("_unzipped/dist", "build")
print("Copied", sum(1 for p in Path("build").rglob("*") if p.is_file()), "files to build/")
