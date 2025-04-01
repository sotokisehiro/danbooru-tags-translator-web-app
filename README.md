# Danbooru Tags Translator Web App

[English version](./README_EN.md)


![](./assets/screenshot.jpg)

## バックエンドサーバー

`uv` (https://docs.astral.sh/uv/) を使用して環境を構築できます。

セットアップ:

```
uv sync
```



Linux でバックエンドサーバーを実行:

```
./scripts/server.sh
```

Windows でバックエンドサーバーを実行:

```
./scripts/server.bat
```

注: `scripts/server.sh` は Linux 用、`scripts/server.bat` は Windows 用です。

## フロントエンドサーバー


Bun (https://bun.sh/) の使用を推奨しますが、お好みで npm などを使っても大丈夫です。


セットアップ:

```
cd frontend
bun i
```



フロントエンドサーバーを実行:

```
bun dev
```

