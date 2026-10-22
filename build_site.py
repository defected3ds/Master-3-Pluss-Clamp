"""Render build step: copy the static site in dist/ to build/."""
import shutil

shutil.copytree("dist", "build", dirs_exist_ok=True)
