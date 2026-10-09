import json, tempfile, subprocess, threading, datetime, hashlib, io, tarfile, base64, shutil
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
buffer=io.BytesIO()
with tarfile.open(fileobj=buffer,mode='w:gz') as archive:
 content=json.dumps({'name':'wea8-age-fixture','version':'1.0.0'}).encode(); info=tarfile.TarInfo('package/package.json'); info.size=len(content); archive.addfile(info,io.BytesIO(content))
tarball=buffer.getvalue(); requests=[]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  requests.append(self.path)
  if self.path.endswith('.tgz'): body=tarball
  else:
   now=datetime.datetime.now(datetime.timezone.utc).isoformat()
   body=json.dumps({'name':'wea8-age-fixture','dist-tags':{'latest':'1.0.0'},'time':{'created':now,'modified':now,'1.0.0':now},'versions':{'1.0.0':{'name':'wea8-age-fixture','version':'1.0.0','dist':{'tarball':f'http://127.0.0.1:{server.server_port}/wea8-age-fixture.tgz','shasum':hashlib.sha1(tarball).hexdigest(),'integrity':'sha512-'+base64.b64encode(hashlib.sha512(tarball).digest()).decode()}}}}).encode()
  self.send_response(200);self.send_header('Content-Type','application/octet-stream' if self.path.endswith('.tgz') else 'application/json');self.end_headers();self.wfile.write(body)
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
fixture=Path(tempfile.mkdtemp(prefix='wea8-age-'))
(fixture/'package.json').write_text(json.dumps({'name':'age-probe','private':True,'dependencies':{'wea8-age-fixture':'1.0.0'}}))
config=f'registry: http://127.0.0.1:{server.server_port}/\nminimumReleaseAge: 1440\nminimumReleaseAgeStrict: true\n'
(fixture/'pnpm-workspace.yaml').write_text(config)
def run(label,*args,expected):
 result=subprocess.run(['pnpm','install','--ignore-scripts','--reporter=append-only',f'--registry=http://127.0.0.1:{server.server_port}/',f'--store-dir={fixture}/store',f'--cache-dir={fixture}/cache',*args],cwd=fixture,text=True,capture_output=True)
 print(label, 'exit',result.returncode);print(result.stdout+result.stderr);assert (result.returncode==0)==(expected==0)
(fixture/'pnpm-workspace.yaml').write_text(config.replace('minimumReleaseAge: 1440\nminimumReleaseAgeStrict: true\n',''))
run('Implicit pnpm 11 defaults: fresh exact version fallback','--lockfile-only',expected=0)
(fixture/'pnpm-lock.yaml').unlink()
(fixture/'pnpm-workspace.yaml').write_text(config.replace('minimumReleaseAgeStrict: true','minimumReleaseAgeStrict: false'))
run('Explicit preserved defaults: fresh exact version fallback','--lockfile-only',expected=0)
(fixture/'pnpm-lock.yaml').unlink()
(fixture/'pnpm-workspace.yaml').write_text(config)
run('Fresh exact version published now: must reject','--lockfile-only',expected=1)
assert 'ERR_PNPM_NO_MATURE_MATCHING_VERSION' in subprocess.run(['pnpm','install','--lockfile-only','--ignore-scripts',f'--registry=http://127.0.0.1:{server.server_port}/'],cwd=fixture,text=True,capture_output=True).stdout
assert not (fixture/'pnpm-lock.yaml').exists()
(fixture/'pnpm-workspace.yaml').write_text(config.replace('minimumReleaseAge: 1440','minimumReleaseAge: 0'))
run('Fixture preparation with age disabled: create lock and store',expected=0)
(fixture/'pnpm-workspace.yaml').write_text(config)
lock=(fixture/'pnpm-lock.yaml').read_bytes();requests.clear();shutil.rmtree(fixture/'node_modules')
run('Frozen install of fresh locked version with explicit 1440: observe','--frozen-lockfile',expected=0)
print('Frozen registry requests:',requests);assert (fixture/'pnpm-lock.yaml').read_bytes()==lock
requests.clear();shutil.rmtree(fixture/'node_modules')
run('Offline frozen install: retain locked graph','--frozen-lockfile','--offline',expected=0)
assert (fixture/'pnpm-lock.yaml').read_bytes()==lock
print('Offline registry requests:',requests);assert requests==[]
server.shutdown();print('All probe assertions passed; fixture:',fixture)
