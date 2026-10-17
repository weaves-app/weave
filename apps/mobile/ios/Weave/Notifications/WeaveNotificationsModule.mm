#import <WeaveAuthSpec/WeaveAuthSpec.h>
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import <OneSignalNotifications/OneSignalNotifications.h>
#import <OneSignalUser/OneSignalUser-Swift.h>
#import "Weave-Swift.h"

@interface WeaveNotificationsModule : NativeWeaveNotificationsSpecBase <NativeWeaveNotificationsSpec>
@end

@implementation WeaveNotificationsModule {
  WeaveNotificationsEngine *_engine;
}
RCT_EXPORT_MODULE(WeaveNotifications)
+ (BOOL)requiresMainQueueSetup { return YES; }
- (instancetype)init {
  if ((self = [super init])) {
    _engine = [WeaveNotificationsEngine new];
    __weak WeaveNotificationsModule *weakSelf = self;
    _engine.onNotificationChanged = ^(NSString *value) { [weakSelf emitOnNotificationChanged:value]; };
  }
  return self;
}
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (void)execute:(NSString *)command payload:(NSString *)payload resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [_engine execute:command payload:payload completion:^(NSString *result) { resolve(result); }];
}
- (void)invalidate { [_engine invalidate]; }
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeWeaveNotificationsSpecJSI>(params);
}
@end
