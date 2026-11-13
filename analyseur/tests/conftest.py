"""Configuration des tests : aucun appel réseau, et le dossier de l'application est importable."""
import os
import sys
from pathlib import Path

os.environ["ONESHEET_HORS_LIGNE"] = "1"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
