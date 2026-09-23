param([string]$BaseUrl = 'http://localhost:5080', [string]$ElasticsearchUrl = 'http://localhost:9200')
$ErrorActionPreference = 'Stop'
function Assert($condition, $message) {
    if (-not $condition) { throw $message }
}
function Search($query, $page = 1, $pageSize = 20) {
    Invoke-RestMethod "$BaseUrl/api/search?q=$([Uri]::EscapeDataString($query))&page=$page&pageSize=$pageSize"
}

# Read-only checks against the two existing indexed iPhone examples.
foreach ($query in @('iphone', 'apple', 'telefon')) {
    $result = Search $query
    Assert ($result.total -eq 2 -and $result.items.Count -eq 2) "$query should match both products"
    Assert ($result.items.name -contains 'Apple iPhone 14 Pro 256 GB') 'iPhone 14 missing'
    Assert ($result.items.name -contains 'Apple iPhone 15 Pro 256 GB') 'iPhone 15 missing'
    Write-Output "PASS: $query (2 products)"
}
foreach ($version in @(15, 14)) {
    $result = Search "iphone $version"
    Assert ($result.items[0].name -eq "Apple iPhone $version Pro 256 GB") 'Incorrect relevance order'
    Assert ($result.items[0].score -gt $result.items[1].score) 'Expected a strictly higher score'
    Write-Output "PASS: iphone $version (higher score)"
}
foreach ($query in @('samsung', '120 Ay', '24 Hz', '0.187 inch', '5000 mAh', '6,1 inch')) {
    $result = Search $query
    Assert ($result.total -eq 0 -and $result.items.Count -eq 0) "$query should not match"
    Write-Output "PASS: $query (0 products)"
}
$result = Search 'A17 Pro'
Assert ($result.total -eq 2) 'Default multi_match OR should match Pro in product names'
Assert ($result.items[0].name -eq 'Apple iPhone 15 Pro 256 GB') 'A17 Pro should rank iPhone 15 first'
Assert ($result.items[0].score -gt $result.items[1].score) 'Nested processor match should increase score'
Write-Output 'PASS: A17 Pro (iPhone 15 first; root Pro match retained)'
foreach ($case in @(
    @{ Query = 'A17'; Id = 2 },
    @{ Query = 'A16 Bionic'; Id = 1 },
    @{ Query = 'Natural Titanium'; Id = 2 },
    @{ Query = '24 Ay'; Id = 2 },
    @{ Query = '0.187 KG'; Id = 2 }
)) {
    $result = Search $case.Query
    Assert ($result.total -eq 1 -and $result.items[0].id -eq $case.Id) "Incorrect nested match: $($case.Query)"
    Write-Output "PASS: $($case.Query)"
}
# Escape Turkish letters so this script also works in Windows PowerShell 5 without a UTF-8 BOM.
$processorName = [string][char]0x130 + [char]0x15F + 'lemci'
foreach ($query in @('processor', $processorName, '256 GB', '120 Hz', '6.1 inch')) {
    $result = Search $query
    Assert ($result.total -eq 2) "Expected both products for $query"
    Write-Output "PASS: $query (2 products)"
}
$result = Search '8 GB'
Assert ($result.total -eq 2 -and $result.items[0].id -eq 2) '8 GB should boost iPhone 15 while preserving root GB matches'
Write-Output 'PASS: 8 GB (numeric match plus existing root matches)'

$first = Search 'iphone 15' 1 1
$second = Search 'iphone 15' 2 1
$empty = Search 'iphone 15' 3 1
Assert ($first.total -eq 2 -and $second.total -eq 2 -and $empty.total -eq 2) 'Incorrect total hits'
Assert ($first.items.Count -eq 1 -and $second.items.Count -eq 1 -and $empty.items.Count -eq 0) 'Incorrect page sizes'
Assert ($first.items[0].id -ne $second.items[0].id) 'Pagination repeated the same product'
Assert ($second.page -eq 2 -and $second.pageSize -eq 1) 'Incorrect pagination metadata'
Assert ((Search '  iphone 15  ').items[0].id -eq $first.items[0].id) 'Query trimming failed'
Assert ($null -eq $first.items[0].PSObject.Properties['attributes']) 'Search document leaked into response'
Assert ($null -ne $first.items[0].score) 'Score missing'
Write-Output 'PASS: pagination, total hits, trim, DTO shape'

foreach ($path in @('', '?q=', '?q=%20%20', '?q=iphone&page=0', '?q=iphone&pageSize=0',
    '?q=iphone&pageSize=101', '?q=iphone&page=2147483647', '?q=iphone&page=101&pageSize=100')) {
    $status = 0
    try { $status = [int](Invoke-WebRequest "$BaseUrl/api/search$path" -UseBasicParsing).StatusCode }
    catch {
        if ($null -eq $_.Exception.Response) { throw }
        $status = [int]$_.Exception.Response.StatusCode
    }
    Assert ($status -eq 400) "Expected 400 for $path, got $status"
}
Write-Output 'PASS: empty query and pagination validation'

foreach ($query in @('ipone', 'iphne')) {
    $result = Search $query
    Assert ($result.total -eq 2) "Typo tolerance failed for $query"
    Assert ($result.items[0].score -lt (Search 'iphone').items[0].score) 'Fuzzy score should be below normal score'
}
foreach ($case in @(@{ Query='iphone 15 pro'; Id=2 }, @{ Query='iphone 14 pro'; Id=1 }, @{ Query='iphne 15'; Id=2 })) {
    Assert ((Search $case.Query).items[0].id -eq $case.Id) "Relevance failed for $($case.Query)"
}
Assert ((Search 'A18').total -eq 0) 'Short model token must not fuzzy-match A17'
Write-Output 'PASS: phrase relevance, controlled typos, short model tokens'

$suggestions = Invoke-RestMethod "$BaseUrl/api/search/suggestions?q=iph"
Assert ($suggestions.Count -eq 2 -and @($suggestions.id | Select-Object -Unique).Count -eq 2) 'Suggestions missing or duplicated'
Assert ($null -eq $suggestions[0].PSObject.Properties['attributes']) 'Suggestion document leaked'
Assert ((Invoke-RestMethod "$BaseUrl/api/search/suggestions?q=i").Count -eq 0) 'One-letter suggestions should be empty'
Write-Output 'PASS: bounded suggestions and minimum length'

$category = ((Invoke-RestMethod "$BaseUrl/api/categories") | Where-Object slug -eq 'telefon').id
$base = "$BaseUrl/api/search?q=iphone&categoryId=$category"
$all = Invoke-RestMethod $base
Assert ($all.total -eq 2 -and $all.facets.brands[0].count -eq 2) 'Brand facet mismatch'
$metadata = @((Invoke-RestMethod "$BaseUrl/api/categories/$category/attributes") | Where-Object isFilterable)
Assert (($all.facets.attributes.code -join ',') -eq ($metadata.attribute.code -join ',')) 'Filterable metadata/order mismatch'
$ram = $all.facets.attributes | Where-Object code -eq 'ram'
Assert (($ram.values.value -join ',') -eq '6,8' -and (($ram.values | ForEach-Object { $_.count }) -join ',') -eq '1,1') 'RAM counts mismatch'
foreach ($case in @(
    @{ Filter='filters[ram]=8'; Count=1; Id=2 },
    @{ Filter='filters[ram]=256'; Count=0 },
    @{ Filter='filters[storage]=256'; Count=2 },
    @{ Filter='filters[has_5g]=true'; Count=2 },
    @{ Filter='filters[has_5g]=false'; Count=0 },
    @{ Filter='filters[processor]=Apple%20A17%20Pro'; Count=1; Id=2 },
    @{ Filter='filters[ram]=8&filters[storage]=256'; Count=1; Id=2 },
    @{ Filter='brandIds=1&brandIds=99999'; Count=2 },
    @{ Filter='brandIds=99999'; Count=0 },
    @{ Filter='isActive=false'; Count=0 }
)) {
    $result = Invoke-RestMethod "$base&$($case.Filter)"
    Assert ($result.total -eq $case.Count) "Filter failed: $($case.Filter)"
    if ($case.Id) { Assert ($result.items[0].id -eq $case.Id) 'Wrong filtered product' }
    Assert ([double]($result.facets.brands | Measure-Object count -Sum).Sum -eq $result.total) 'Filtered facet count mismatch'
}
Assert ((Invoke-RestMethod "$BaseUrl/api/search?q=iphone&categoryId=99999").total -eq 0) 'Category filter failed'
$filtered = Invoke-RestMethod "$base&filters[ram]=8"
Assert (($filtered.facets.attributes | Where-Object code -eq 'ram').values[0].count -eq 1) 'Filtered RAM count mismatch'
$paged = Invoke-RestMethod "$base&pageSize=1"
Assert ($paged.total -eq 2 -and $paged.items.Count -eq 1 -and $paged.facets.brands[0].count -eq 2) 'Facets must cover all matches, not just a page'
Write-Output 'PASS: root/dynamic filters, nested isolation, filtered facets, metadata order, pagination counts'

foreach ($suffix in @('filters[ram]=8', 'categoryId=2&filters[unknown]=x', 'categoryId=2&filters[ram]=abc',
    'categoryId=2&filters[has_5g]=yes', 'brandIds=-1',
    'categoryId=2&filters[color]=Natural%20Titanium')) {
    $status = 0
    try { $status = [int](Invoke-WebRequest "$BaseUrl/api/search?q=iphone&$suffix" -UseBasicParsing).StatusCode }
    catch { if ($null -eq $_.Exception.Response) { throw }; $status = [int]$_.Exception.Response.StatusCode }
    Assert ($status -eq 400) "Invalid filter should be rejected: $suffix"
}
Write-Output 'PASS: invalid and non-filterable attribute rejection'

function Tokens($text) {
    $body = [Text.Encoding]::UTF8.GetBytes((@{ analyzer='product_text'; text=$text } | ConvertTo-Json))
    ((Invoke-RestMethod -Method Post "$ElasticsearchUrl/products/_analyze" -ContentType 'application/json' -Body $body).tokens.token -join ' ')
}
foreach ($pair in @(
    @{ Ascii='buzdolabi'; Turkish=('buzdolab'+[char]0x131) },
    @{ Ascii='akilli telefon'; Turkish=('ak'+[char]0x131+'ll'+[char]0x131+' telefon') },
    @{ Ascii='camasir makinesi'; Turkish=([string][char]0xE7+'ama'+[char]0x15F+[char]0x131+'r makinesi') },
    @{ Ascii='islemci'; Turkish=$processorName },
    @{ Ascii='telefon'; Turkish='TELEFON' }
)) {
    Assert ((Tokens $pair.Ascii) -eq (Tokens $pair.Turkish)) "Normalization differs: $($pair.Ascii)"
}
Assert ((Search 'islemci').total -eq (Search $processorName).total) 'Normalized attribute name search failed'
Assert ((Tokens 'iPhone Galaxy ThinkPad RTX Ryzen A17 Pro M3') -eq 'iphone galaxy thinkpad rtx ryzen a17 pro m3') 'Model tokens were altered'
Write-Output 'PASS: Turkish analyzer equivalence, actual attribute search, model tokens without stemming'
