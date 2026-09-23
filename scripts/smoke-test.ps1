param([string]$BaseUrl = 'http://localhost:5080')
$ErrorActionPreference = 'Stop'
$script:checks = 0
function Assert($condition, $message) {
 if (-not $condition) { throw $message }
 $script:checks++
}
function Request($method, $path, $body = $null, $expected = 200) {
 $parameters = @{ Uri = "$BaseUrl$path"; Method = $method; UseBasicParsing = $true }
 if ($null -ne $body) {
  $parameters.ContentType = 'application/json; charset=utf-8'
  $parameters.Body = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 20))
 }
 try { $response = Invoke-WebRequest @parameters; $status = [int]$response.StatusCode; $content = $response.Content }
 catch {
  if ($null -eq $_.Exception.Response) { throw }
  $status = [int]$_.Exception.Response.StatusCode
  $content = $_.ErrorDetails.Message
 }
 Assert ($status -eq $expected) "$method $path expected $expected, got $status : $content"
 if ($content) {
  $content = $content.TrimStart([char]0xFEFF).Trim()
  if ($content.StartsWith('{') -or $content.StartsWith('[')) { return ($content | ConvertFrom-Json) }
 }
}
$tag = [Guid]::NewGuid().ToString('N')
$createdProducts = @()
$createdCategories = @()
$createdBrands = @()
$createdAttributes = @()
$assignments = @()
try {
 $spec = Request GET '/swagger/v1/swagger.json'
 Assert (@($spec.paths.PSObject.Properties).Count -ge 10) 'Swagger paths missing'
 $null = Request GET '/swagger/index.html'
 $seed = Request GET '/api/products/by-slug/apple-iphone-14-pro-256-gb'
 Assert ($seed.attributes.Count -eq 7) 'Seed attributes missing'
 Assert ($seed.attributes[0].code -eq 'ram') 'Attribute order incorrect'
 $c = Request POST '/api/categories' @{ name="Cep Telefonları $tag" } 201
 $createdCategories += $c.id
 Assert ($c.slug -eq "cep-telefonlari-$tag") 'Turkish slug normalization failed'
 $c2 = Request POST '/api/categories' @{ name="Cep Telefonları $tag" } 201
 $createdCategories += $c2.id
 Assert ($c2.slug -eq "$($c.slug)-2") 'Slug collision suffix missing'
 $null = Request PUT "/api/categories/$($c.id)" @{ name=$c.name; parentCategoryId=$c.id } 400
 $null = Request PUT "/api/categories/$($c2.id)" @{ name=$c2.name; parentCategoryId=$c.id } 200
 $null = Request PUT "/api/categories/$($c.id)" @{ name=$c.name; parentCategoryId=$c2.id } 400
 $null = Request DELETE "/api/categories/$($c.id)" $null 409
 $null = Request PUT "/api/categories/$($c2.id)" @{ name=$c2.name; parentCategoryId=$null } 200
 $b = Request POST '/api/brands' @{ name="Test $tag"; isActive=$false } 201
 $createdBrands += $b.id
 Assert (-not $b.isActive) 'Inactive brand became active'
 $null = Request PUT "/api/brands/$($b.id)" @{ name="Updated $tag"; isActive=$true }
 $a = Request POST '/api/attributes' @{ name='RAM'; code="ram_$tag"; dataType='Number'; unit='GB' } 201
 $createdAttributes += $a.id
 $d = Request POST '/api/attributes' @{ name='Date'; code="date_$tag"; dataType='Date' } 201
 $createdAttributes += $d.id
 $null = Request POST '/api/attributes' @{ name='Duplicate'; code=$a.code; dataType='Number' } 409
 $null = Request POST '/api/attributes' @{ name='Invalid'; code="invalid_$tag"; dataType=9 } 400
 $null = Request PUT "/api/attributes/$($a.id)" @{ name='Memory'; code=$a.code; dataType='Number'; unit='GB' }
 foreach ($aid in @($a.id,$d.id)) {
  $null = Request POST "/api/categories/$($c.id)/attributes" @{ attributeDefinitionId=$aid; isRequired=($aid -eq $a.id); isComparable=$true; displayOrder=1 } 201
  $assignments += ,@($c.id,$aid)
 }
 $null = Request POST "/api/categories/$($c.id)/attributes" @{ attributeDefinitionId=$a.id } 409
 $null = Request DELETE "/api/attributes/$($a.id)" $null 409
 $p = @{ categoryId=$c.id; brandId=$b.id; name="Product $tag"; attributes=@(); isActive=$false }
 $null = Request POST '/api/products' $p 400
 $p.attributes = @($null)
 $null = Request POST '/api/products' $p 400
 $p.attributes = @(@{ attributeDefinitionId=$a.id; textValue='8' })
 $null = Request POST '/api/products' $p 400
 $p.attributes = @(@{ attributeDefinitionId=$a.id; numericValue=8; textValue='8' })
 $null = Request POST '/api/products' $p 400
 $p.attributes = @(@{ attributeDefinitionId=$a.id; numericValue=8 },@{ attributeDefinitionId=$a.id; numericValue=9 })
 $null = Request POST '/api/products' $p 400
 $p.attributes = @(@{ attributeDefinitionId=$a.id; numericValue=8 },@{ attributeDefinitionId=$d.id; dateValue='2026-01-01T00:00:00' })
 $null = Request POST '/api/products' $p 400
 $p.attributes[1].dateValue = '2026-01-01T00:00:00Z'
 $product = Request POST '/api/products' $p 201
 $createdProducts += $product.id
 Assert (-not $product.isActive) 'Inactive product became active'
 Assert ($product.attributes.Count -eq 2) 'Date attribute missing'
 $null = Request DELETE "/api/brands/$($b.id)" $null 409
 $null = Request DELETE "/api/categories/$($c.id)/attributes/$($a.id)" $null 409
 $null = Request PUT "/api/attributes/$($a.id)" @{ name='RAM'; code=$a.code; dataType='Text' } 409
 $p.attributes = @(@{ attributeDefinitionId=$a.id; numericValue=16 })
 $updated = Request PUT "/api/products/$($product.id)" $p
 Assert ($updated.attributes.Count -eq 1 -and $updated.attributes[0].value -eq 16) 'Attribute replacement failed'
 Assert ($updated.updatedAtUtc -gt $product.updatedAtUtc) 'Attribute update timestamp unchanged'
 $p.categoryId = $c2.id
 $null = Request PUT "/api/products/$($product.id)" $p 400
 $unchanged = Request GET "/api/products/$($product.id)"
 Assert ($unchanged.category.id -eq $c.id -and $unchanged.attributes[0].value -eq 16) 'Failed update changed data'
 $p.attributes = @()
 $moved = Request PUT "/api/products/$($product.id)" $p
 Assert ($moved.category.id -eq $c2.id -and $moved.attributes.Count -eq 0) 'Category move retained old attributes'
 $null = Request POST "/api/categories/$($c2.id)/attributes" @{ attributeDefinitionId=$a.id; isRequired=$true } 409
 $page = Request GET "/api/products?brandId=$($b.id)&categoryId=$($c2.id)&isActive=false&page=1&pageSize=1"
 Assert ($page.totalCount -eq 1 -and $page.totalPages -eq 1 -and $page.items.Count -eq 1) 'Pagination/filter failed'
 $null = Request GET '/api/products?pageSize=101' $null 400
 $null = Request GET '/api/products?page=0' $null 400
 $null = Request GET '/api/products/9223372036854775807' $null 404
 $null = Request GET '/api/brands'
 $null = Request GET '/api/categories'
 $null = Request GET '/api/attributes'
 $null = Request GET "/api/categories/$($c.id)/attributes"
 Write-Output "PASS: $script:checks HTTP and behavior checks."
}
finally {
 foreach ($id in $createdProducts) { $null = Request DELETE "/api/products/$id" $null 204 }
 foreach ($pair in $assignments) { $null = Request DELETE "/api/categories/$($pair[0])/attributes/$($pair[1])" $null 204 }
 [array]::Reverse($createdCategories)
 foreach ($id in $createdCategories) { $null = Request DELETE "/api/categories/$id" $null 204 }
 foreach ($id in $createdBrands) { $null = Request DELETE "/api/brands/$id" $null 204 }
 foreach ($id in $createdAttributes) { $null = Request DELETE "/api/attributes/$id" $null 204 }
}
