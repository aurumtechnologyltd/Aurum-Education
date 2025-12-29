-- Drop the ambiguous overloaded function that takes text input and returns no metadata
DROP FUNCTION IF EXISTS match_document_chunks(text, double precision, integer, uuid);

-- Ensure the vector version is preserved (comment only, no action needed as we didn't drop it)
-- The remaining function signature is:
-- match_document_chunks(vector, double precision, integer, uuid)
