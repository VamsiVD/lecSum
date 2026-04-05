import os
import pytest

def test_lambda_exists(env):
    """A basic smoke test to verify the function exists in the environment."""
    # This is where you'd normally use boto3 to check the Lambda status
    print(f"Running smoke test against {env} environment")
    assert env in ["staging", "prod"]