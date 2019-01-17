
# Creating issues for tasks

Any requested changes should have a new issue created for them on this repository. You can tag issues with labels like "Feature Request" or "Bug" to be descriptive of what the issue relates to.


# Process for contributing code:

* Any code change must be associated with an existing GitHub issue on this repository
* If you want to contribute code changes you should
  1. fork this repository
  2. make a new branch w/the issue number in its name, for example `git checkout -b fix/12-some-bug`
  3. when code is ready, open a pull request from your fork to this repository
* Pull requests titles must include the number of the issue they're related to, as well as a brief description of the contents of the changes in the pull request
* Pull request summary and description should include a comprehensive summary of the changes you've made. Additional comments in GitHub on certain file lines are also helpful to explain changes.
* Any documentation that has become outdated due to changes in a pull request must be updated.
* Any new code, or code that has been changed, must have unit tests covering the new or changed code.

# Code quality expectations:

* Statement unit test coverage must remain above 85%.
* Code quality must pass linting via the `npm run lint` command

# Expectations after code is merged:

* Code owners listed in the `CODEOWNERS` file are responsible for all code in the repository, but if you've contributed a change you should expect that you may be consulted on any changes to your code in the future.
* Accepted code changes may not be released immediately.