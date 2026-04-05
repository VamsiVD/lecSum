import pytest

def pytest_addoption(parser):
    """Registers the --env flag so pytest doesn't crash."""
    parser.addoption(
        "--env", 
        action="store", 
        default="staging", 
        help="Environment: staging or prod"
    )

@pytest.fixture
def env(request):
    """Allows you to use 'env' as an argument in your test functions."""
    return request.config.getoption("--env")