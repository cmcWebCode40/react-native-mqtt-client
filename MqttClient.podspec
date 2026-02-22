require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "RNMqttClient"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/cmcWebCode40/react-native-mqtt-client.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/**/*.h"

  s.dependency "MQTTClient", "~> 0.15"

  # Enable Clang modules for Objective-C++ so MQTTClient's `@import Foundation;` compiles in .mm files
  s.pod_target_xcconfig = {
    "CLANG_ENABLE_MODULES" => "YES",
    "OTHER_CFLAGS" => "$(inherited) -fmodules -fcxx-modules"
  }

  install_modules_dependencies(s)
end
