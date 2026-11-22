# 池袋ショー・マイマップ 2026

第35回東京ミネラルショー（2026年12月11〜14日、池袋サンシャインシティ文化会館2・3・4階）向け、個人用の巡回管理マップ。

## 現時点の完成度

- Web画面：日付・フロア選択、公式会場図、店舗検索、お気に入り、訪問順、メモ、訪問済、位置ピン、記録のバックアップが動く初版。
- `shops.json`：**現状は191店舗の先行収録**。公式全件更新は `scripts/update_shops.py` によりGitHub上で実行する必要があります。
- 地図：公式の配置図画像を表示。全ブースの自動位置指定・番号タップは**未完成**。

## GitHub Pagesでの使い方

`index.html` / `app.js` / `styles.css` / `shops.json` / `map.json` をリポジトリのルートに置きます。GitHub Pagesは `main` の `/(root)` から公開してください。

## ★公式出展者の全件取り込み（iPhoneから）

現在のサイトに5ファイルをアップ済みなら、**追加するのは次の2ファイルだけ**。

1. `scripts/update_shops.py`（Pythonプログラム）
2. `.github/workflows/update-shops.yml`（GitHub Actions設定）

どちらも **ファイル名だけでなく、フォルダの階層が重要**です。完成したリポジトリでは次の配置になります。

```
index.html
app.js
styles.css
shops.json
map.json
scripts/
  update_shops.py
.github/
  workflows/
    update-shops.yml
```

GitHubブラウザ画面の **Add file → Create new file** から `scripts/update_shops.py` のようにスラッシュ込みで名前を入力すると、必要なフォルダが作成できます。内容はこのZIP内のファイルからコピーできます。iPhoneで長いコードをコピーしづらい場合はPCからフォルダごとアップロードする方が簡単です。

**先にPythonファイル、次にワークフローファイル**を追加してください。後者をコミットすると、`push` イベントで自動実行される設定です（GitHub Actionsが有効な場合）。

GitHubの **Actions → 「池袋ショー 出展者一覧を公式サイトから更新」** で実行結果を確認できます。自動で動かなければ **Run workflow** を押して手動実行してください。

**成功した場合：** 公式の国内8区分・海外2区分の10ページから `shops.json` を作成し、GitHub上のファイルを自動更新します。公開マップを再読み込みすると、収録件数が191件から増えているはずです。

**失敗した場合：** 既存の `shops.json` はそのまま残ります。Actionsの赤い実行履歴からエラーログを確認してください。公式サイト側の接続制限やHTML変更が原因の可能性があります。

> 注：こちらの実行環境では公式サイトへのスクリプトからの実接続ができないため、**公式全件の取得成功は現時点では未確認**です。HTMLの解析と既存店舗IDの互換性は模擬データでテスト済みです。

## 記録の引き継ぎ

店舗IDは従来どおり「店舗名＋会場番号」を基に決定します。既存191店舗のIDがすべて一致することを確認済みです。ただし公式サイトで店舗名自体が変更された場合は、別のお店として扱われる可能性があります。

お気に入り・メモなどの個人データはiPhoneのWebアプリ内の `localStorage` に保存され、GitHubの公開リポジトリには書き込まれません。念のため、店舗データ更新前に**記録をバックアップ**してください。

## 公式情報

- 出展者一覧：https://www.tokyomineralshow.com/exhibitor/
- フロアマップ：https://www.tokyomineralshow.com/floormap/
- 開催概要：https://www.tokyomineralshow.com/outline/

公式の掲載内容は変更される場合があります。マップは非公式・個人制作です。
