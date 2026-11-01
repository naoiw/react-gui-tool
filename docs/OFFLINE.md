# Windows オフライン版

## ダウンロードして起動（開発環境不要）

1. [Build Windows offline ZIP](https://github.com/naoiw/react-gui-tool/actions/workflows/build-offline.yml) の成功した実行を開きます。
2. **Artifacts** の `react-gui-tool-offline-windows` をダウンロードし、ZIPを展開します。
3. ZIP内の `start-server.bat` をダブルクリックします。
4. **ChromeまたはEdge** でシリアルポートを選択して使用します。既定ブラウザが非対応の場合は、コマンドプロンプトに表示されたURLをChrome/Edgeで開いてください。
5. 終了するときはコマンドプロンプトで `Ctrl+C` を押します。

実行時はWindows PowerShell 5.1とブラウザのみ使用します。Node.js・npm・pnpm・Python・インターネット接続・管理者権限は不要です。シリアル機器、ドライバ、ブラウザによるアクセス許可は引き続き必要です。

ZIP内のファイル構成:

```text
start-server.bat
README-OFFLINE.txt
scripts/
  serve-dist.ps1
dist/
  index.html
  assets/
    ...
```

Viteの配布資材は `file://` ではなく、BATから起動する `http://127.0.0.1:<自動選択ポート>/` で配信します。Web Serial APIが利用可能なセキュアコンテキストです。

## ソースコードから配布ZIPを作る

ビルド用PCにNode.js 22とpnpm 9を用意し、次を実行します。

```bash
pnpm install --frozen-lockfile
pnpm bundle:offline
```

`release/react-gui-tool-offline-windows.zip` と `release/offline-bundle/` を生成します。WindowsではPowerShell `Compress-Archive`、Linux/macOSではシステムの `zip` を利用します。実行側にこれらのビルドツールは不要です。

**ソースコードの Code → Download ZIP には `dist/` が含まれません。** ビルド不要で使う場合はActionsの配布ZIPを利用してください。コミットされていた古いEXEとZIPは内容が古いため削除しました。

## テストと注意

- GitHub ActionsのWindows環境でビルド、ZIP展開、ローカルサーバーのHTML/JS配信をテストします。
- 配信対象は `dist/` 以下で、アクセスは同一PCのループバックアドレス127.0.0.1に限定します。
- PowerShell実行ポリシーの `Bypass` は起動したプロセスのみで、システム設定は変更しません。
- 実際のUSBシリアル通信にはWindows実機と接続機器による確認が必要です。
