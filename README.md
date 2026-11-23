# 10 池袋ショーマイマップ：浅草式のブース直描画版

## 今回の更新

- 公式配置図に透明な枠を重ねる方式を廃止し、map.json のブース座標とサイズから、独立した四角のブースを描く方式へ変更。
- 検索ヒットは緑、お気に入りはオレンジ枠、店舗の位置表示は緑色にして通知を出さない。
- ブース番号をタップして店舗詳細、日付・階切替、お気に入り、訪問順、メモ、訪問済み、拡大縮小、バックアップ機能を維持。
- 失敗した画像取得用スクリプト・Actionsを廃止し、店舗データ更新専用の workflow を同梱。
- 画像の輪郭検出は行わず、外部地図画像が読み込めなくてもブースの四角は表示可能。

## 大事：精度について

- 地図は独立描画なので画像への重なりずれは生じないが、map.json に登録済みの座標・区画形状が公式の実配置と全件一致する保証はまだない。
- 2階13〜97番は位置対応が未確認なので描画しない。該当店は店舗一覧とメモの機能を使える。
- これは「公式図の完全な複製」ではなく、登録済み位置に基づく模式図の更新版。

## ZIP内のファイル

- index.html / app.js / styles.css / map.json : Webアプリ本体・配置データ
- shops.json : **このZIP内は作業環境に残っている191店舗の古いサンプルです。GitHubの自動更新済み店舗データではありません。**
- scripts/update_shops.py : 店舗データの取得スクリプト
- github_workflows/update-shops.yml : 店舗データ更新だけを行う Actions 設定（iPhoneから見えるよう、隠しフォルダ名を使用していません）

## GitHubへの反映

1. index.html / app.js / styles.css / map.json をリポジトリ直下に上書き。
2. scripts/update_shops.py は GitHub の scripts/ に配置。
3. github_workflows/update-shops.yml は、GitHubでは **.github/workflows/update-shops.yml** に配置。ZIPの github_workflows/ をそのまま GitHub直下に置いても Actions の設定にはなりません。
4. **shops.jsonは上書きしないこと。** GitHub上で更新された店舗情報を保持してください。アップロード時は、ZIP中の shops.json だけ選択しないでください。
5. GitHubの .github/workflows/update-shops.yml を2の配置済みスクリプトを使う旧来の設定に戻せば、マップ画像を取得する Actions を実行する必要はありません。

## 個人記録

GitHub Pagesの同じURLで開けば、既存のlocalStorageの保存キーを変更していないため、従来のお気に入り・メモ・訪問順を引き継ぐ設計です。作業前には「記録をバックアップ」をおすすめします。
