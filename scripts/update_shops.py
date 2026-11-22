#!/usr/bin/env python3
"""2026年・第35回東京ミネラルショーの公式10ページから shops.json を更新。

実行: pip install requests beautifulsoup4
      python scripts/update_shops.py

不完全な取得では既存のデータを上書きしません。
住所・電話番号・メールアドレスは公開マップ用データに収録しません。
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import re
import sys
import time
import unicodedata
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parents[1]
OFFICIAL = 'https://www.tokyomineralshow.com'
PATHS = [
    '/exhibitor/',
    '/exhibitor/list_ka/',
    '/exhibitor/list_sa/',
    '/exhibitor/list_ta/',
    '/exhibitor/list_na/',
    '/exhibitor/list_ha/',
    '/exhibitor/list_ma/',
    '/exhibitor/list_ya/',
    '/exhibitor/list_foreign/',
    '/exhibitor/list_foreign_2/',
]


def normalize(s: str) -> str:
    return re.sub(r'\s+', ' ', s.replace('\u3000', ' ')).strip()


def split_booths(raw: str) -> list[str]:
    """'88～97', 'A34,A35', 'DB7' を扱う。ブース種別の英字は消さない。"""
    text = unicodedata.normalize('NFKC', raw)
    text = text.replace('〜', '~').replace('～', '~').replace('–', '~').replace('－', '-')
    result: list[str] = []
    for token in re.split(r'[,、，/／]', text):
        token = normalize(token)
        if not token:
            continue
        match = re.fullmatch(r'([A-Z]*)(\d{1,3})\s*~\s*([A-Z]*)(\d{1,3})', token, re.I)
        if match:
            prefix1, a, prefix2, b = match.groups()
            prefix1, prefix2 = prefix1.upper(), prefix2.upper() or prefix1.upper()
            a, b = int(a), int(b)
            if prefix1 == prefix2 and 1 <= b - a + 1 <= 75:
                result.extend(f'{prefix1}{n}' for n in range(a, b + 1))
                continue
        result.append(re.sub(r'\s+', '', token).upper())
    return list(dict.fromkeys(result))


def exhibitor_name(cell: Tag) -> str:
    """住所・電話番号と同じ td にあっても店舗名だけを取り出す。"""
    # 公式リストでは、最初の改行前が業者名、その下は住所・連絡先。
    text = cell.get_text(separator='\n', strip=True)
    lines = [normalize(line) for line in text.splitlines() if normalize(line)]
    return lines[0] if lines else ''


def entry(name: str, hall: str, area: str, booth: str) -> dict | None:
    name, hall, area, booth = map(normalize, (name, hall, area, booth))
    if hall not in ('1', '2', '3') or not name:
        return None
    # いずれかのブース番号が未発表でも、出展者自体は落とさない。
    if area.upper() not in ('L', 'C', 'R', ''):
        return None
    if re.fullmatch(r'社名|出展者|会社名', name):
        return None
    key = unicodedata.normalize('NFKC', normalize(name)).casefold()
    uid = 's-' + hashlib.sha1(f'{key}|{hall}'.encode('utf-8')).hexdigest()[:12]
    return {
        'id': uid,
        'name': name,
        'floor': int(hall) + 1,
        'hall': int(hall),
        'area': area.upper(),
        'boothText': booth if booth else '番号未発表',
        'booths': split_booths(booth),
    }


def parse_page(html: str) -> list[dict]:
    soup = BeautifulSoup(html, 'html.parser')
    result: list[dict] = []
    for tr in soup.select('tr'):
        cells = tr.find_all(['th', 'td'], recursive=False)
        if len(cells) < 4:
            continue
        name = exhibitor_name(cells[0])
        fields = [normalize(c.get_text(' ', strip=True)) for c in cells[1:4]]
        row = entry(name, *fields)
        if row:
            result.append(row)
    return result


def merge_duplicate(a: dict, b: dict) -> None:
    # 同名出展者が同じ会場で複数行掲載された場合、ブースを結合。
    for booth in b['booths']:
        if booth not in a['booths']:
            a['booths'].append(booth)
    if a['boothText'] == '番号未発表':
        a['boothText'] = b['boothText']
    elif b['boothText'] != '番号未発表' and b['boothText'] not in a['boothText'].split(' / '):
        a['boothText'] += ' / ' + b['boothText']
    if not a['area']:
        a['area'] = b['area']


def collect(session: requests.Session) -> tuple[list[dict], list[dict]]:
    by_id = {}
    report = []
    for path in PATHS:
        url = OFFICIAL + path
        response = session.get(url, timeout=30)
        response.raise_for_status()
        # requests はサーバーの charset を優先するため、日本語の誤変換を避ける。
        response.encoding = 'utf-8'
        rows = parse_page(response.text)
        if len(rows) < 5:
            raise RuntimeError(f'{path}: 表から {len(rows)} 件しか読み取れませんでした（処理中止）')
        for item in rows:
            if item['id'] in by_id:
                merge_duplicate(by_id[item['id']], item)
            else:
                by_id[item['id']] = item
        report.append({'path': path, 'rows': len(rows)})
        print(f'{path}: {len(rows)}件')
        time.sleep(.2)
    shops = sorted(by_id.values(), key=lambda s: (s['floor'], s['area'], s['name'].casefold()))
    if len(shops) < 300 or len({s['floor'] for s in shops}) != 3:
        raise RuntimeError(f'出展者 {len(shops)} 件で不十分と判断しました（処理中止）')
    return shops, report


def main() -> int:
    target = ROOT / 'shops.json'
    original = json.loads(target.read_text(encoding='utf-8'))
    session = requests.Session()
    session.headers['User-Agent'] = 'Mozilla/5.0 (compatible; PersonalMineralShowMap/1.0)'
    try:
        shops, report = collect(session)
    except Exception as exc:
        print(f'取得または検証に失敗しました: {exc}\n既存 shops.json は変更していません。', file=sys.stderr)
        return 1

    old = original.get('shops', [])
    matched = sum(1 for s in old if any(n['id'] == s['id'] for n in shops))
    print(f'従来の登録: {len(old)}件、新しい登録: {len(shops)}件、ID一致: {matched}件')
    # 既存191店のうち多数が失われた場合は、公式HTML変更の疑いとして停止する。
    if old and matched < len(old) * .65:
        print('既存店との照合率が低いため、安全のため更新を中止しました。', file=sys.stderr)
        return 1

    original['shops'] = shops
    original['coverage'] = 'official-lists'
    original['coverageNote'] = '2026年公式の国内8区分・海外2区分の全10ページから取得。変更・欠場等は公式サイトで確認してください。'
    original['source'] = OFFICIAL + '/exhibitor/'
    original['fetchedAt'] = datetime.now(timezone.utc).isoformat(timespec='seconds')
    original['sourcePageCounts'] = report
    # 一時ファイルに書き終えてから置き換えることで途中失敗を防ぐ。
    tmp = target.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(original, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(target)
    print(f'保存完了：{len(shops)}店舗（ブース未発表を含む）')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
