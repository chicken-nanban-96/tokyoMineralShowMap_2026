# 池袋ショー マイマップ 2026 初版

対象：第35回東京ミネラルショー（2026年12月11日〜14日、サンシャインシティ文化会館2・3・4階）。

## GitHub Pages で公開

1. 浅草版とは**別のリポジトリ**を作る。
2. `index.html`、`app.js`、`styles.css`、`shops.json`、`map.json` を**同じ階層（リポジトリ直下）**にアップロードする。
3. Settings → Pages → Deploy from a branch → `main` / `(root)` を保存する。
4. ページのURLをSafariで開く。初回読み込みには通信が必要。ホーム画面に追加する場合、Safariとは記録の保存領域が別になることがあるので、バックアップと復元を利用する。

**注意：初期の `shops.json` は191店舗の先行収録版です。全出展者一覧を取り込めているわけではありません。** 店舗名・会場・エリア・ブース番号は2026年11月17日現在の主催者公開情報から先行入力。正確な最新情報は公式サイトを確認してください。

## ファイルの役割

- `index.html`：画面の外枠。
- `styles.css`：デザイン。
- `app.js`：検索・お気に入り・日別訪問順・メモ・訪問済・個人用位置ピン・バックアップ・ズーム。
- `shops.json`：出展者一覧。今後は更新スクリプトで置き換え可能。
- `map.json`：開催フロア・2026年公式マップの画像URL・画像サイズ。
- `scripts/update_shops.py`：**公式サイトの全10ページから店舗データを抽出するスクリプト**。通常はPCやGitHub Actionsで実行。
- `.github/workflows/update-shops.yml`：GitHubで手動実行する出展者更新ワークフロー。必須ではない。

## 全出展者に更新するには

方法A（PCなどから）：`pip install requests beautifulsoup4` → `python scripts/update_shops.py` → 生成された `shops.json` を上書き。

方法B（GitHub Actions）：上記 `.github/workflows/update-shops.yml` と `scripts/update_shops.py` を同じフォルダ構成でリポジトリに登録 → GitHubの Actions タブで「2026東京ミネラルショー 出展者一覧の更新」→ Run workflow。`contents: write` 権限が許可されている必要があります。

公式サイトのHTML構造が変わると更新が失敗する可能性があります。その場合、元の `shops.json` は保持されます。**この環境では外部URLをプログラムで直接ダウンロードできないため、更新スクリプト自体を公式サイトに接続して実行する検証は未実施**です。

## 地図について

初版の地図は、2026年公式のフロアマップ画像を外部URLから表示しています。古い年の図や架空の配置は使っていません。現在はブースごとのタップ位置をすべて割り当てていないため、店の詳細から「この店の位置を指定」を押し、公式図内の目的ブースをタップして個人用位置ピンを付けます。ピン、訪問順などは同じブラウザのローカルストレージに保持。

第1会場は **2階**、第2会場は **3階**、第3会場は **4階**。主催者の一覧の「会場 1/2/3」を階数と取り違えないように注意。

公式： https://www.tokyomineralshow.com/ ｜ 出展者一覧： https://www.tokyomineralshow.com/exhibitor/ ｜ 配置図： https://www.tokyomineralshow.com/floormap/

## 個人データ

`memory-ikebukuro-tokyo-mineral-show-2026.json` は非公開で保管。**Public GitHubリポジトリへアップロードしないでください。** 記録はイベントID単位に分離され、浅草マップの記録とは混ざりません。
