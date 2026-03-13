import io

import pandas as pd
import pytest

from app.analytics.models import FileType
from app.analytics.service import _parse_to_dataframe, clean_dataframe


def test_normalization_and_cleaning():
    # Create a "messy" DataFrame
    data = {
        "  Employee ID ": [1, 2, 2, None],
        " First Name  ": ["John", "Jane", "Jane", None],
        "Department": ["Sales", "HR", "HR", None],
        "EmptyCol": [None, None, None, None],
    }
    df_raw = pd.DataFrame(data)

    # Run cleaning logic
    df_clean = clean_dataframe(df_raw)

    # B2 Check: Normalization
    assert "employee_id" in df_clean.columns
    assert "first_name" in df_clean.columns
    assert "department" in df_clean.columns
    assert "emptycol" not in df_clean.columns  # B3: Column drop

    # B4 Check: Deduplication
    assert len(df_clean) == 2  # 1 unique and 1 duplicate/null handled
    assert df_clean.index.tolist() == [0, 1]  # Reset index


def test_parse_csv():
    content = b"id,name\n1,test"
    df = _parse_to_dataframe(content, FileType.csv)
    assert len(df) == 1
    assert df.iloc[0]["name"] == "test"
