LERAK — OLD RULES FIX

កំណែនេះត្រូវបានធ្វើឡើងវិញដោយយក RULE LOGIC ពី game.js ចាស់របស់គម្រោង
មុនពេល game.js ត្រូវបានលុបចេញពី GitHub។

ច្បាប់ដែលរក្សាវិញ:
- មាន 2 modes: រែកធម្មតា និង រែកព័ទ្ធ
- Opening: ជ្រើសកូនទ័ព 2 នៅជួរមុខ ដែលរំលងគ្នា 1 ក្រឡា ហើយចេញមុខ 1 ក្រឡា
- រែកធម្មតា: កូនដើរត្រង់ 4 ទិស; ស្តេចមិនអាចដើរ
- Capture: ចូលក្រឡាដែលមានសត្រូវ 2 នៅសងខាង → ចាប់ 2
- Normal win: កូនទ័ពសត្រូវអស់ ឬស្តេចត្រូវរែក
- Surround: បន្ថែម group/liberty capture និងស្តេចក្នុងក្រុមអាចត្រូវព័ទ្ធ
- Optional ហៅរែក flow
- 3:00 + 2s
- 30s Bot fallback

Graphics:
- Wooden board មាន grain
- Wooden/3D-looking white & black pieces
- King មាន crown
- Highlight សម្រាប់ opening, move, capture

របៀបដាក់:
1. លុប/ជំនួស file ចាស់ក្នុង folder game ដែលអ្នកប្រើ។
2. ដាក់ index.html + lerak.css + lerak.js ជាមួយគ្នា។
3. Reload GitHub Pages ហើយ Hard Refresh។
4. បើ browser នៅបង្ហាញ version ចាស់ សូមបិទ tab ហើយបើក site ម្តងទៀត។

ចំណាំ:
កំណែនេះជាការលេង local + Bot fallback។ Online matchmaking ពិតត្រូវភ្ជាប់ Firebase/backend បន្ថែម។
