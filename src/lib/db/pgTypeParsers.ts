import { types } from "pg";

// node-postgres returns BIGINT (COUNT(*)) and NUMERIC (AVG(...)) as strings by
// default because they can exceed the safe JS integer range. None of this
// app's aggregates do, so normalize them to plain numbers once, globally,
// instead of casting at every call site.
const OID_INT8 = 20;
const OID_NUMERIC = 1700;

types.setTypeParser(OID_INT8, (value) => Number.parseInt(value, 10));
types.setTypeParser(OID_NUMERIC, (value) => Number.parseFloat(value));
