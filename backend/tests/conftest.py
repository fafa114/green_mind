"""Keep test databases outside the checkout, independent of import order."""
import atexit
import os
import shutil
import tempfile

_test_dir = tempfile.mkdtemp(prefix='greenmind-tests-')
atexit.register(shutil.rmtree, _test_dir, ignore_errors=True)
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(_test_dir, 'test.db')
os.environ['JWT_SECRET'] = 'integration-test-secret'
os.environ.pop('CEMS_EXCEL_PATH', None)
