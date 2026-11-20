const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// 2026-11-20 上线时踩到：变量名后紧跟全角字符（$NEW_ID（…）在非 UTF-8 语言环境下会被读成变量名的一部分，脚本在发布前一步报错退出。
test('shell scripts brace every variable that sits right before a non-ASCII character', () => {
  for (const file of fs.readdirSync('scripts').filter(name => name.endsWith('.sh'))) {
    const source = fs.readFileSync(`scripts/${file}`, 'utf8');
    const bad = source.split('\n').filter(line => /\$[A-Za-z_][A-Za-z0-9_]*[^\x00-\x7F]/.test(line));
    assert.deepEqual(bad, [], file);
  }
});

// 发布前的检查只拦后台改动：线上文件等于 production 历史上的某个版本（上次发布的样子）时放行，对不上任何版本才停。
test('release guard compares live settings with production history, not only the new production', () => {
  const release = fs.readFileSync('scripts/release.sh', 'utf8');
  assert.match(release, /'log', '-n', '50', '--format=%H', 'origin\/production', '--', file/);
  assert.match(release, /pastVersions\(file\)\.includes\(now\) \? releasing : edited/);
  assert.match(release, /if \(edited\.length\) \{[\s\S]*process\.exit\(1\);/);
});
