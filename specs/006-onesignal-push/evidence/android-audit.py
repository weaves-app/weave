"""Read-only audit of completed Android debug test/build outputs. Run from repo root."""
from pathlib import Path
import json
import re
import xml.etree.ElementTree as ET

logs = Path('specs/006-onesignal-push/evidence/logs')
suites = []
for directory in (
    'apps/mobile/android/app/build/test-results/testDebugUnitTest',
    'apps/mobile/vendor/clerk-android/source/api/build/test-results/testDebugUnitTest',
):
    files = sorted(Path(directory).glob('TEST-*.xml'))
    assert files, f'Missing completed tests: {directory}'
    for path in files:
        result = ET.parse(path).getroot().attrib
        suites.append({'suite': result['name'], **{
            name: int(result[name]) for name in ('tests', 'failures', 'errors', 'skipped')
        }})
assert all(suite['failures'] == 0 and suite['errors'] == 0 for suite in suites)
(logs / 'android-implementation-results.json').write_text(json.dumps(suites, indent=2) + '\n')
manifest = Path('apps/mobile/android/app/build/intermediates/merged_manifests/debug/processDebugManifest/AndroidManifest.xml')
xml = ET.parse(manifest).getroot()
namespace = '{http://schemas.android.com/apk/res/android}'
permissions = sorted(element.attrib[namespace + 'name'] for element in xml.findall('uses-permission'))
metadata = {element.attrib[namespace + 'name']: element.attrib.get(namespace + 'value') for element in xml.findall('.//meta-data')}
graph = (logs / 'android-implementation-verified.txt').read_text()
assert 'BUILD SUCCESSFUL' in graph
modules = sorted(set(re.findall(r'com\.onesignal:([^\s:]+):([0-9.]+)', graph)))
forbidden = [line for line in graph.splitlines() if re.search(
    r'com\.onesignal:(?:OneSignal|location):|com\.google\.android\.gms:play-services-location:|com\.huawei\.hms:location:', line, re.I)]
location_permissions = [permission for permission in permissions if 'LOCATION' in permission]
assert not forbidden and not location_permissions
assert metadata.get('com.onesignal.suppressLaunchURLs') == 'true'
assert 'com.onesignal.NotificationOpened.DEFAULT' not in metadata
apk = Path('apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk')
assert apk.is_file()
audit = {'variant': 'debug', 'manifest': str(manifest), 'permissions': permissions,
         'oneSignalModules': modules, 'forbiddenLocationArtifactLines': forbidden,
         'locationPermissions': location_permissions, 'suppressLaunchURLs': 'true',
         'notificationOpenedDefaultPresent': False, 'apk': str(apk)}
(logs / 'android-implementation-location-audit.json').write_text(json.dumps(audit, indent=2) + '\n')
print(json.dumps({'tests': {key: sum(suite[key] for suite in suites) for key in ('tests', 'failures', 'errors', 'skipped')}, 'audit': audit}, indent=2))
