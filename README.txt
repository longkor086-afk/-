KHMER GAME — Coins & Betting V1

1) ដាក់ coins-betting.js នៅ root របស់ GitHub ជាមួយ index.html។
2) ក្នុង index.html មុន </body> បន្ថែម:
<script src="coins-betting.js"></script>

3) ប៊ូតុង Online ចាស់អាចប្តូរ onclick ទៅ:
openBetting('create')
openBetting('join')
openBetting('quick')

4) ប៊ូតុង + ក្នុង Profile អាចប្រើ:
onclick="openShop()"

Packages:
10,000 = $0.99
50,000 = $4.50
100,000 = $8.99
500,000 = $30.99

Stake:
1,000 → payout 1,900 (fee 100)
10,000 → payout 19,500 (fee 500)
100,000 → payout 199,000 (fee 1,000)
1,000,000 → payout 1,990,000 (fee 10,000)
10,000,000 → payout 19,900,000 (fee 100,000)

ចំណាំ: V1 ជា UI/validation ប៉ុណ្ណោះ។ Payment និងការកាត់ Coins ពិតៗត្រូវធ្វើ Server-side មុនដាក់ប្រើជាក់ស្តែង។
