select 
    con.conname as constraint_name,
    src_schema.nspname as source_schema,
    source.relname as source_table,
    source_col.attname as source_column,
    trg_schema.nspname as target_schema,
    target.relname as target_table,
    target_col.attname as target_column
from 
    pg_constraint con
inner join 
    pg_class source on source.oid = con.conrelid
inner join
    pg_attribute source_col on source_col.attrelid = con.conrelid and source_col.attnum = con.conkey[1] and source_col.attisdropped = false
inner join
    pg_namespace src_schema on src_schema.oid = source.relnamespace
inner join 
    pg_class target on target.oid = con.confrelid
inner join
    pg_attribute target_col on target_col.attrelid = con.confrelid and target_col.attnum = con.confkey[1] and source_col.attisdropped = false    
inner join
    pg_namespace trg_schema on trg_schema.oid = target.relnamespace 