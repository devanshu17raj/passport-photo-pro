import sys
from unittest.mock import MagicMock

# Force-inject a fake rembg module into Python's global registry 
# BEFORE pytest collects or scans any test files.
sys.modules['rembg'] = MagicMock()