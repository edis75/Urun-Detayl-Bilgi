SELECT 'Categories' AS entity, count(*) FROM "Categories"
UNION ALL SELECT 'Brands', count(*) FROM "Brands"
UNION ALL SELECT 'AttributeDefinitions', count(*) FROM "AttributeDefinitions"
UNION ALL SELECT 'CategoryAttributes', count(*) FROM "CategoryAttributes"
UNION ALL SELECT 'Products', count(*) FROM "Products"
UNION ALL SELECT 'ProductAttributeValues', count(*) FROM "ProductAttributeValues";

SELECT tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace AND contype IN ('f', 'c')
ORDER BY conname;
