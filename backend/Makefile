PYTHON  := venv/Scripts/python
PYTEST  := venv/Scripts/pytest
PYLINT  := venv/Scripts/pylint

.PHONY: test lint test-storage test-all

test:
	$(PYTEST) tests/ -v

test-storage:
	$(PYTEST) tests/test_storage.py -v

test-all:
	$(PYTEST) tests/ -v --tb=short

lint:
	$(PYLINT) app --rcfile=.pylintrc
