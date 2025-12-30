$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
$session.Cookies.Add((New-Object System.Net.Cookie("Hm_lvt_f9186ca08bfa7e087a80aec3f15fdc40", "1749257745", "/", ".wahlap.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("Hm_lvt_683f6ae0fb03df45ca2815c7c6c9b63f", "1749257745", "/", ".wahlap.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("Hm_lvt_61e01d99425d4e567059acb04c8312f9", "1749257745", "/", ".wahlap.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga_4RSMWEY7DG", "GS2.1.s1749257744`$o1`$g0`$t1749257763`$j41`$l0`$h0", "/", ".wahlap.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga", "GA1.2.1375165317.1732029647", "/", ".wahlap.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_gid", "GA1.2.752971592.1753631451", "/", ".wahlap.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_t", "5c9d55fce03bb1da3033fd9710780327", "/", "maimai.wahlap.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("userId", "616482591086719", "/", "maimai.wahlap.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("friendCodeList", "413252453611467%2C327118368658347%2C910127337286367%2C230113034909696%2C991737872540706%2C651578686620647%2C851248592186019%2C462168897746288", "/", "maimai.wahlap.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_gat", "1", "/", ".wahlap.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("_ga_HMWCCH9Y0H", "GS2.2.s1753631451`$o10`$g1`$t1753631532`$j43`$l0`$h0", "/", ".wahlap.com")))
Invoke-WebRequest -UseBasicParsing -Uri "https://maimai.wahlap.com/maimai-mobile/friend/rivalOn/" `
    -Method "POST" `
    -WebSession $session `
    -Headers @{
    "Accept"                    = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
    "Accept-Encoding"           = "gzip, deflate, br, zstd"
    "Accept-Language"           = "zh-CN,zh;q=0.9"
    "Cache-Control"             = "no-cache"
    "Origin"                    = "https://maimai.wahlap.com"
    "Pragma"                    = "no-cache"
    "Referer"                   = "https://maimai.wahlap.com/maimai-mobile/friend/"
    "Sec-Fetch-Dest"            = "document"
    "Sec-Fetch-Mode"            = "navigate"
    "Sec-Fetch-Site"            = "same-origin"
    "Sec-Fetch-User"            = "?1"
    "Upgrade-Insecure-Requests" = "1"
    "sec-ch-ua"                 = "`"Not)A;Brand`";v=`"8`", `"Chromium`";v=`"138`", `"Google Chrome`";v=`"138`""
    "sec-ch-ua-mobile"          = "?0"
    "sec-ch-ua-platform"        = "`"Windows`""
} `
    -ContentType "application/x-www-form-urlencoded" `
    -Body "idx=230113034909696&token=5c9d55fce03bb1da3033fd9710780327"