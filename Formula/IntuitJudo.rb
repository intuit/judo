require "language/node"

# Test Command-line interfaces using yaml and node.js
class Intuitjudo < Formula
  desc "Test command-line interfaces"
  homepage "https://github.com/Intuit/judo#readme"
  url "https://registry.npmjs.org/@intuit/judo/-/judo-0.3.2.tgz"
  sha256 "c4d86391ba9841413de5633b2599f453769a424bf34cbe22c39cb6c43da4079e"

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  resource("testyaml") do
    url "https://raw.githubusercontent.com/intuit/judo/master/test-examples/simple-test-suite/hello-world.yml"
    sha256 "0b6101f0145cc24569709595adeefc23e4bd8340fafe6a8ec4ea2c09e5a308bb"
  end
  
  test do
    resource("testyaml").stage do
      assert_match "JUDO TESTS COMPLETE", shell_output("#{bin}/judo hello-world.yml")
    end
  end

end
