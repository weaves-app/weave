from pathlib import Path
import os, subprocess, sys
root = Path('/Users/pravinraj/workspace/weave')
entry = root / 'apps/mobile/index.ts'
original = entry.read_bytes()
fixture = Path('/private/tmp/weave-ux-native-fixture.ts').read_bytes()
Path('/private/tmp/weave-ux-index-original.ts').write_bytes(original)
env = os.environ.copy()
env['JAVA_HOME'] = '/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home'
env['MAESTRO_CLI_NO_ANALYTICS'] = 'true'
env['MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED'] = 'true'
device = sys.argv[1]
platform = sys.argv[2]
tag = sys.argv[3] if len(sys.argv) > 3 else platform
flow = sys.argv[4] if len(sys.argv) > 4 else '/private/tmp/weave-ux-native-flow.yaml'
large = 'large' in tag
previous_size = None
previous_ime = None
previous_handwriting = None
adb = '/Users/pravinraj/Library/Android/sdk/platform-tools/adb'
if platform == 'android' and device.startswith('emulator-'):
  previous_handwriting = subprocess.check_output([adb, '-s', device, 'shell', 'settings', 'get', 'secure', 'stylus_handwriting_enabled'], text=True).strip()
  previous_ime = subprocess.check_output([adb, '-s', device, 'shell', 'settings', 'get', 'secure', 'show_ime_with_hard_keyboard'], text=True).strip()
if large:
  if platform == 'ios':
    previous_size = subprocess.check_output(['xcrun', 'simctl', 'ui', device, 'content_size'], text=True).strip()
  else:
    previous_size = subprocess.check_output(['/Users/pravinraj/Library/Android/sdk/platform-tools/adb', '-s', device, 'shell', 'settings', 'get', 'system', 'font_scale'], text=True).strip()

def set_size(value):
  if platform == 'ios':
    subprocess.run(['xcrun', 'simctl', 'ui', device, 'content_size', value], check=True)
  else:
    subprocess.run(['/Users/pravinraj/Library/Android/sdk/platform-tools/adb', '-s', device, 'shell', 'settings', 'put', 'system', 'font_scale', value], check=True)
def restart():
  if platform == 'ios':
    subprocess.run(['xcrun', 'simctl', 'terminate', device, 'si.tryweave'], check=False)
    subprocess.run(['xcrun', 'simctl', 'launch', device, 'si.tryweave'], check=True)
  else:
    adb = '/Users/pravinraj/Library/Android/sdk/platform-tools/adb'
    subprocess.run([adb, '-s', device, 'shell', 'am', 'force-stop', 'si.tryweave'], check=True)
    subprocess.run([adb, '-s', device, 'shell', 'am', 'start', '-W', '-n', 'si.tryweave/.MainActivity'], check=True)
try:
  if previous_handwriting is not None:
    subprocess.run([adb, '-s', device, 'shell', 'settings', 'put', 'secure', 'stylus_handwriting_enabled', '0'], check=True)
  if previous_ime is not None:
    subprocess.run([adb, '-s', device, 'shell', 'settings', 'put', 'secure', 'show_ime_with_hard_keyboard', '1'], check=True)
  if large:
    set_size('accessibility-large' if platform == 'ios' else '1.6')
  entry.write_bytes(fixture)
  restart()
  result = subprocess.run(['/private/tmp/weave-maestro-2.11.0/maestro/bin/maestro', '--device', device, 'test', flow, '--format', 'junit', '--output', f'/private/tmp/weave-ux-{tag}-fixture.xml', '--test-output-dir', f'/private/tmp/weave-ux-{tag}-fixture'], env=env, cwd=root, timeout=240)
  print('FIXTURE_RESULT', result.returncode, flush=True)
finally:
  if entry.read_bytes() == fixture:
    entry.write_bytes(original)
    print('PRODUCTION_ENTRY_RESTORED', flush=True)
    if previous_handwriting is not None:
      args = ['delete', 'secure', 'stylus_handwriting_enabled'] if previous_handwriting == 'null' else ['put', 'secure', 'stylus_handwriting_enabled', previous_handwriting]
      subprocess.run([adb, '-s', device, 'shell', 'settings', *args], check=True)
      print('EMULATOR_HANDWRITING_PREFERENCE_RESTORED', flush=True)
    if previous_ime is not None:
      args = ['delete', 'secure', 'show_ime_with_hard_keyboard'] if previous_ime == 'null' else ['put', 'secure', 'show_ime_with_hard_keyboard', previous_ime]
      subprocess.run([adb, '-s', device, 'shell', 'settings', *args], check=True)
      print('EMULATOR_KEYBOARD_PREFERENCE_RESTORED', flush=True)
    if previous_size is not None:
      set_size(previous_size)
      print('TEXT_SIZE_RESTORED', previous_size, flush=True)
    restart()
  else:
    raise RuntimeError('Entry changed externally; refusing to overwrite it')

sys.exit(result.returncode)
