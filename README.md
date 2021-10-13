<p align='center'>
  <img src='./assets/logo.png' width='350'>
</p>

<p align='center'>
   <a href='https://circleci.com/gh/intuit/judo'><img src='https://circleci.com/gh/intuit/judo.svg?style=svg' alt='CircleCI build'/></a>
  <a href='https://www.npmjs.com/package/@intuit/judo'><img src='https://img.shields.io/npm/v/@intuit/judo.svg' alt='NPM Version'/></a>
  <a href='https://www.npmjs.com/package/@intuit/judo'><img src='https://img.shields.io/npm/dt/@intuit/judo.svg' alt='NPM downloads'/></a>
  <a href='https://codecov.io/gh/Intuit/judo'><img src='https://img.shields.io/codecov/c/github/intuit/judo.svg' alt='Code Coverage'/></a>
</p>

Judo is an easy-to-use Command Line Interface (CLI) integration testing framework, driven from a simple `yaml` file that instructs the framework what commands to run and how to assert the outcome. Test your CLI tools in an automated fashion using nothing but stdin, stdout and stderr.

## Prerequisites

| Build Dependencies                |           |
| --------------------------------- | --------- |
| [node](https://nodejs.org/en/)    | \>=8.7.0  |

## Installation

Judo is distributed and installed using [npm](https://www.npmjs.com/), the package manager that comes bundled with node.js. In order to be able to install Judo, you will need to first ensure that you have node.js installed on your system (which will also install npm for you). Then you can run the following command:

```
npm i -D @intuit/judo
```

Then in `package.json`

```json
"scripts": {
  "test": "judo <tests-dir>"
}
```

OR if you don't have a `package.json` because you're not in a JavaScript project using npm, then you can install Judo globally and just run it from the command line:

```bash
# install it globally
npm i -g @intuit/judo

# then run it anywhere from the command line
judo <tests-dir>
```

## Building for Local Development

If you would like to locally develop Judo:

```bash
# clone the judo repository
git clone https://github.com/intuit/judo

# go to the judo directory
cd judo

# then install the dependencies
npm i

# next build the src/ files into dist/
npm run build

# finally link the binary executable
npm link

# and voila, use Judo from CLI!
judo <file>.yml
```

## Usage

The Judo framework interacts with CLIs and provides assertions against the output. The framework assumes the CLIs are installed and available for use. Judo can execute commands, respond to `stdin` when expected `stdout` output occurs, assert the exit code, and assert that the overall output of `stdout` and `stderr` contains or doesn't contain certain strings.

```bash
# point to a "test scenario" file
judo <file>.yml

# point to a "test scenario" JSON file
judo <file>.json

# or point to a "test suite" directory of "test suite" yaml files. See options section for the optional flag to support JSON files.
judo <directory>
```

## Options

- `--timeout <n>` : sets a max time in milliseconds that a run step can take before being considered a timeout. ex (`--timeout 1500`)

- `--junitreport | -j` : writes the test results to a file called `junit.xml` in the current working directory. This report is in xUnit format.

- `--includejsonfiles | -ij` : include `.json` test files in the test directory along with `.yml` files.

### Creating Tests with YAML files

Judo organizes tests into "test suites", which comprise of "test scenarios", and each test scenario can contain "steps". A typical test directory may look like this:

```
judo-tests/
  |_update/                    # the update "test suite", containing all tests around updating
  |  |_update-download.yml     # a "test scenario" that asserts the update command downloads something
  |  |_update-to-path.yml      # a "test scenario" that asserts the updated binary is in the path
  |_help/                      # the help "test suite", containing all tests around the --help option
     |_help-output/            # a "test scenario" that asserts the help output is correct
```

Within each "test scenario" `yaml` file, individual "steps" can be defined which can run commands, run prerequisite setup commands, respond to interactions expected by the command line application, and assert the exit code and `stdout`/`stderr` output contains certain things. This is a basic example of a "test suite" with a single step named "helloWorld":

```yml
# test-examples/simple/hello-world.yml
run:
  helloWorld:                  # a "helloWorld" test suite "step"
    command: 'echo "hi!"'
    expectCode: 0
    outputContains:
    - 'hi!'
    outputDoesntContain:
    - 'bye!'
```

Running `judo test-examples/simple/hello-world.yml` will yield this output:

<p align="center">
  <img src="./docs/screenshot.png" />
</p>

In this example, a new child process will be spawned which runs `echo "hi"`, then the following assertions will be made:

- the exit code was 0
- the total `stdout` and `stderr` contains `"hi!"`
- the total `stdout` and `stderr` does NOT contain `"bye!"`

If the example `helloWorld` test above had `expectCode: 1` instead, the test would fail and produce this output:

<p align="center">
  <img src="./docs/screenshot-failed.png" />
</p>

### Importing test fragments

Judo supports [JSON Reference](https://tools.ietf.org/html/draft-pbryan-zyp-json-ref-03) in test scenarios. This means you can create reusable test functionality modules and import them from your main test scenario using the `$ref` keyword. Imports can be done from a file, URL or another place within the same document.

```yml
# test-examples/fragment-test-suite/hello-world-fragment.yml
run:
  testFragment:
    prerequisiteCwd: .
    prerequisites: 
      $ref: '#/components/createTempFile'
    command: cat /tmp/temp-dir/temp-file.txt
    expectCode: 0
    outputContains:
    - this will be in the temp-file.txt
components:
  createTempFile:
    - mkdir -p /tmp/temp-dir
    - echo "this will be in the temp-file.txt" > /tmp/temp-dir/temp-file.txt
```
Other examples 

```yml
$ref: 'judo-tests/_fragments/setup.json'
$ref: 'judo-tests/_fragments/setup.yml#/definitions/prerequisites'
$ref: 'http://example.com/setup.yml#/definitions/prerequisites'
$ref: '#/definitions/prerequisites'
```

### Using variable substitution

Variable substitution is supported inside value strings using `{{variableName}}` syntax. All variables need to be declared inside the `vars` section in your test scenario like in the following example:

```yml
run:
  helloWorld:
    command: 'echo "{{hello}}"'
    expectCode: 0
    outputContains:
    - '/hi!/g'
    outputDoesntContain:
    - '/bye!/g'
vars:
  hello: 'hi!'
```

---

### Complete YAML Example

This is a more complete example, running multiple commands and responding to the `stdin` when appropriate:

```yml
run:
  someCommand:
    prerequisiteCwd: /Users/efrancis/devel/DEVGRU/judo/temp/
    prerequisites:
    - echo "this command will run before the command being tested"
    - echo "this will too"
    - git clone <some repo>
    - cd <some-repo>
    command: git checkout -b "some-feature"
    cwd: /Users/hansolo/test
    when:
    - 'What do you fly?': 'Millenium Falcon'
    - 'Did you shoot first?' : 'y'
    expectCode: 0
    outputContains:
    - 'This string should be in the complete stdout/stderr output'
    - /This is a regex[!]+/g/
    outputDoesntContain:
    - 'This string should NOT be in the complete stdout/stderr output'
  anotherCommand:
    command: 'echo "hi!"'
    expectCode: 0
    outputContains:
    - 'hi!'
    outputDoesntContain:
    - 'bye!'
```

In this example, a new child process will be spawned which runs all of the commands in the `prerequisites` block, inside the `prerequisitesCwd` directory if it's provided. Once that's complete, another child process will be spawned to execute `git checkout -b "some-feature"`, then:

- when the `stdout` or `stderr` contains "`What do you fly?`", the string "`Millenium Falcon \n`" will be sent to the process' `stdin`
- when the `stdout` or `stderr` contains "`Did you shoot first?`", the string "`y\n`" will be sent to the process' `stdin`
- the exit code was 0
- the total `stdout` and `stderr` contains `hi!`
- the total `stdout` and `stderr` output matches the regular expression `/This is a regex[!]+/g/`
- the total `stdout` and `stderr` does NOT contain `bye!`

After that it will spawn another child process and run the `echo "hi!"` command assertion described in the first example.

### Complete JSON Example

This is a more complete example using JSON and similar to the above YML example, running multiple commands and responding to the `stdin` when appropriate:

```js
{
  "run": {
    "someCommand": {
      "prerequisiteCwd": "/Users/efrancis/devel/DEVGRU/judo/temp/",
      "prerequisites": [
        "echo \"this command will run before the command being tested\"",
        "echo \"this will too\"",
        "git clone <some repo>",
        "cd <some-repo>"
      ],
      "command": "git checkout -b \"some-feature\"",
      "cwd": "/Users/hansolo/test",
      "when": [
        {
          "What do you fly?": "Millenium Falcon"
        },
        {
          "Did you shoot first?": "y"
        }
      ],
      "expectCode": 0,
      "outputContains": [
        "This string should be in the complete stdout/stderr output",
        "/This is a regex[!]+/g/"
      ],
      "outputDoesntContain": [
        "This string should NOT be in the complete stdout/stderr output"
      ]
    },
    "anotherCommand": {
      "command": "echo \"hi!\"",
      "expectCode": 0,
      "outputContains": [
        "hi!"
      ],
      "outputDoesntContain": [
        "bye!"
      ]
    }
  }
}
```

## How it Works

Judo operates in the following order:

- (if given a directory) searches recursively for all `.yml` "test scenario" files
- for each `.yml` "test scenario", Judo will iterate over each "step" inside that "test scenario"
- for each "step", Judo will spawn a new child process in the directory specified with `prerequisiteCwd` and execute all `prerequisites` at once by combining then with `<command1> && <command2> && ...`
- once prerequisites are complete, Judo will spawn another new child process, this time in the `cwd` specified in the "step", and execute the `command` for that "step". This uses the `node-pty` package to simulate a full terminal as if a user is executing the commands.
- if any `when` assertions are specified for the step, Judo will look for them and respond to them when found. Each will only be responded to once, then marked as complete.
- once the command exits, the output and exit code will be asserted from the `expectCode`, `outputContains`, and `outputDoesntContain` properties of the "step"

## Things to Know

Each `when` response will only happen once, in order of their definition in the `yaml` file. So if you expect the same input multiple times, you need to write multiple responses to it.

## Terminologies

- <font color="red">Bug</font>: A bug computer definition is referred to as a failure or a flaw in the software program. A Bug produces an incorrect or undesired result that deviates from the expected result or behavior.
- <font color="red">Child process</font>: A child process in computing is a process created by another process (the parent process). This technique pertains to multitasking operating systems, and is sometimes called a subprocess or traditionally a subtask.
- <font color="red">Commands</font>: In computing, a command is a directive to a computer program to perform a specific task. It may be issued via a command-line interface, such as a shell, or as input to a network service as part of a network protocol, or as an event in a graphical user interface triggered by the user selecting an option in a menu.
- <font color="red">Command Line Interface (CLI)</font>: A command line interface (CLI) is a text-based user interface (UI) used to view and manage computer files. Command line interfaces are also called command-line user interfaces, console user interfaces and character user interfaces.
- <font color="red">cwd</font>: The CWD (Current Working Directory) is a path (of a directory) inside the file system, where the shell is currently working. The current working directory is essential for resolving relative paths. Cd is a generic command found in the Command Interpreter of most operating systems. Learn more about basic linux commands _[here](https://hackr.io/blog/basic-linux-commands)_.
- <font color="red">echo</font>: In computing, echo is a command that outputs the strings it is being passed as arguments. It is a command available in various operating system shells and typically used in shell scripts and batch files to output status text to the screen or a computer file, or as a source part of a pipeline.
- <font color="red">Execute</font>: Execute and execution are terms that describe the process of running a computer software program, script, or command. Learn more about execute _[here](https://www.computerhope.com/jargon/e/execute.htm)_.
- <font color="red">git</font>: [Git](https://git-scm.com/) is software for tracking changes in any set of files, usually used for coordinating work among programmers collaboratively developing source code during. Check out some of the basics git commands _[here](https://www.atlassian.com/git/glossary)_.
- <font color="red">git clone</font>: git clone is a Git command line utility which is used to target an existing repository and create a clone, or copy of the target repository. Learn more about **git clone** _[here](https://www.atlassian.com/git/tutorials/setting-up-a-repository/git-clone)_.
- <font color="red">JavaScript</font>: [JavaScript](https://www.javascript.com/) often abbreviated as JS, is a programming language that conforms to the ECMAScript specification. JavaScript is high-level, often just-in-time compiled, and multi-paradigm. It has curly-bracket syntax, dynamic typing, prototype-based object-orientation, and first-class functions.
- <font color="red">Recursion</font>: Recursion in computer science is a method where the solution to a problem depends on solutions to smaller instances of the same problem (as opposed to iteration). Learn more about recursion _[here](https://everythingcomputerscience.com/discrete_mathematics/Recurssion.html)_.
- <font color="red">Regex</font>: A regular expression (shortened as regex or regexp; also referred to as rational expression) is a sequence of characters that specifies a search pattern. Learn more about regex _[here](https://www.computerhope.com/unix/regex-quickref.htm)_.
- <font color="red">Repository</font>: A software repository, or “repo” for short, is a storage location for software packages. Often a table of contents is also stored, along with metadata. A software repository is typically managed by source control or repository managers. Package Managers allow for installing and updating the repositories (sometimes called “packages”) versus having to do this manually.
- <font color="red">Spawned</font>: Spawn in computing refers to a function that loads and executes a new child process. The current process may wait for the child to terminate or may continue to execute concurrent computing. Creating a new subprocess requires enough memory in which both the child process and the current program can execute.
- <font color="red">stdin</font>: Standard input is a stream from which a program reads its input data. The program requests data transfers by use of the read operation. Learn more about stdin _[here](https://www.howtogeek.com/435903/what-are-stdin-stdout-and-stderr-on-linux/)_.
- <font color="red">stdout</font>: Standard output is a stream to which a program writes its output data. The program requests data transfer with the write operation. Learn more about stdout _[here](https://www.howtogeek.com/435903/what-are-stdin-stdout-and-stderr-on-linux/)_.
- <font color="red">stderr</font>: Standard error is another output stream typically used by programs to output error messages or diagnostics. It is a stream independent of standard output and can be redirected separately. Learn more about stderr _[here](https://www.howtogeek.com/435903/what-are-stdin-stdout-and-stderr-on-linux/)_.
- <font color="red">string</font>: In computer programming, a string is traditionally a sequence of characters, either as a literal constant or as some kind of variable. Most programming languages have a data type called a string, which is used for data values that are made up of ordered sequences of characters, such as "hello world". A string can contain any sequence of characters, visible or invisible, and characters may be repeated
- <font color="red">Variable</font>: Variable is a symbolic name associated with a value and whose associated value may be changed.
- <font color="red">YAML</font>: [YAML](https://www.redhat.com/en/topics/automation/what-is-yaml#:~:text=YAML%20is%20a%20data%20serialization,is%20for%20data%2C%20not%20documents.) is a data serialization language that is often used for writing configuration files. Depending on whom you ask, YAML stands for yet another markup language or YAML ain't markup language (a recursive acronym), which emphasizes that YAML is for data, not documents. **.yml** is the file extension for YAML files.
