from __future__ import annotations

from pathlib import Path

from flask_frozen import Freezer

from web_app import app, BASE_DIR, IMAGES_DIR, VIDEO_DIR


BUILD_DIR = BASE_DIR / "build"

app.config["FREEZER_DESTINATION"] = str(BUILD_DIR)
app.config["FREEZER_REMOVE_EXTRA_FILES"] = True
app.config["FREEZER_RELATIVE_URLS"] = True

freezer = Freezer(app)


def _iter_relative_files(folder: Path):
    for file in folder.rglob("*"):
        if file.is_file():
            yield file.relative_to(folder).as_posix()


@freezer.register_generator
def asset_image():
    for relative_path in _iter_relative_files(IMAGES_DIR):
        yield {"filename": relative_path}


@freezer.register_generator
def video_asset():
    for relative_path in _iter_relative_files(VIDEO_DIR):
        yield {"filename": relative_path}


if __name__ == "__main__":
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    freezer.freeze()
    print(f"Static site generated at: {BUILD_DIR}")
