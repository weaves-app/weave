#import <WeaveAuthSpec/WeaveAuthSpec.h>
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>
#import "Weave-Swift.h"

@interface WeaveAuthModule : NativeWeaveAuthSpecBase <NativeWeaveAuthSpec>
@end

@implementation WeaveAuthModule {
  WeaveAuthEngine *_engine;
}

RCT_EXPORT_MODULE(WeaveAuth)

+ (BOOL)requiresMainQueueSetup { return YES; }

- (instancetype)init {
  if ((self = [super init])) {
    _engine = [WeaveAuthEngine new];
    __weak WeaveAuthModule *weakSelf = self;
    _engine.onSessionChanged = ^(NSString *value) { [weakSelf emitOnSessionChanged:value]; };
  }
  return self;
}

- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }

- (void)execute:(NSString *)command
        payload:(NSString *)payload
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject {
  [_engine execute:command payload:payload completion:^(NSString *result) {
    resolve(result);
  }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeWeaveAuthSpecJSI>(params);
}
@end
