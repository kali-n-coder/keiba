# 文化祭競馬

GitHub Pagesで公開できる、Firebase Firestore同期のWeb競馬ゲームです。

## 画面

- `index.html`: 参加者用。名前登録、馬選択、応援ポイント使用、レース観戦。
- `admin.html`: 管理者用。ポイント付与、レース開始、結果確定、配当。

## 同期の仕組み

管理画面がFirestoreの `state/currentRace` に `seed` と `startTime` を保存します。各端末は同じseedから同じレース展開を計算するため、馬の位置を連打で同期しなくても全員ほぼ同じ画面になります。

## Firebase

新規Firebaseプロジェクト `keiba-fes-260525` を作成済みです。`src/firebaseConfig.js` には作成したWebアプリの設定を反映済みです。

Firestoreルールは文化祭の管理端末前提の簡易設定です。URLを広く公開する場合は、Firebase Authenticationや管理者権限ルールを追加してください。

## ローカル確認

```bash
npm.cmd install
npm.cmd test
npm.cmd run serve
```

表示確認:

- 参加者: `http://localhost:4173/`
- 管理者: `http://localhost:4173/admin.html`

## GitHub Pages

GitHubのリポジトリ設定で Pages の Source を `Deploy from a branch` にして、`main` / root を指定してください。
