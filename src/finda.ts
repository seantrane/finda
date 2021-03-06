import { sync as emptyDirSync } from 'empty-dir';
import { existsSync } from 'fs-extra';
import { get, isString, startCase, trimEnd } from 'lodash';
import { hostname, userInfo } from 'os';
// import { sync as gitConfigSync } from 'parse-git-config';
import { resolve as pathResolve } from 'path';
import { exec as shExec, which as shWhich } from 'shelljs';
import spdxCorrect = require('spdx-correct');

/**
 * Finda, a utility for finding common variables and values
 *
 * @export
 * @class Finda
 */
export class Finda {

  cache: Map<string, string>;
  gitPath: string;
  packageJsonPath: string;

  constructor() {
    this.resetGitPath();
    this.resetPackageJsonPath();
    this.cache = new Map();
  }

  resetGitPath(value = '.git') {
    this.gitPath = value;
  }

  resetPackageJsonPath(value = 'package.json') {
    this.packageJsonPath = value;
  }

  /**
   * Find author email
   *
   * Try to find author email via;
   * - require(package.json).author.email
   *
   * @param {string} [defaultEmail]
   * @returns {string}
   * @memberof Finda
   */
  authorEmail(defaultEmail?: string): string {
    const author = this._getFromPackage('author.name', this._getFromPackage('author', null));
    let email = this._getFromPackage('author.email');
    if (isString(author) && typeof email === 'undefined') {
      email = (author.match(/<[^@]+.+(?=>)/g) || []).join('').substr(1);
    }
    if (get(email, 'length') < 6) {
      email = this.gitEmail();
    }
    if (typeof email === 'undefined' || get(email, 'length') < 6) {
      email = defaultEmail || `${userInfo().username}@${hostname()}`;
    }
    return email;
  }

  /**
   * Find author name
   *
   * Try to find author name via;
   * - require(package.json).author.name
   *
   * @param {string} [defaultValue]
   * @returns {string}
   * @memberof Finda
   */
  authorName(defaultValue?: string): string {
    let name = this._getFromPackage('author.name', this._getFromPackage('author', defaultValue));
    if (isString(name)) {
      name = trimEnd((name.match(/^[^\<\(]+/g) || []).join(''));
    }
    if (typeof name === 'undefined' || get(name, 'length') < 1) {
      name = this.gitName();
    }
    if (typeof name === 'undefined' || get(name, 'length') < 1) {
      name = startCase(this.username());
    }
    return name;
  }

  /**
   * Find author URL
   *
   * Try to find author URL via;
   * - require(package.json).author.url
   *
   * @param {string} [defaultValue]
   * @returns {string}
   * @memberof Finda
   */
  authorUrl(defaultValue?: string): string {
    const author = this._getFromPackage('author.name', this._getFromPackage('author', null));
    let url = this._getFromPackage('author.url', defaultValue);
    if (isString(author) && typeof url === 'undefined') {
      url = (author.match(/\([^\<\>]+(?=\))/g) || []).join('').substr(1);
    }
    if (typeof url === 'undefined' || get(url, 'length') < 1) {
      url = `https://github.com/${this.githubUsername()}`;
    }
    return url;
  }

  /**
   * Find info from .git/config file
   *
   * @param {string} path Path to property ('user.email')
   * @returns {string}
   * @memberof Finda
   */
  getFromGitConfig(path: string): string {
    if (!get(path, 'length')) {
      return undefined;
    }
    const cacheKey = `git_config_${path}_${process.cwd()}`;
    let str = this.cache.get(cacheKey);
    if (str) {
      return str;
    }
    // let config = gitConfigSync();
    // if (typeof config === 'undefined') config = gitConfigSync({ path: '~/.gitconfig' });
    // str = get(config, path);
    if (shWhich('git')) {
      str = shExec(`git config --get ${path}`, { silent: true }).stdout.toString().trim();
    }
    this.cache.set(cacheKey, str);
    return str;
  }

  /**
   * Find git email address
   *
   * Try to find git email address via;
   * - git config --get user.email
   *
   * @returns {string}
   * @memberof Finda
   */
  gitEmail(): string {
    return this.getFromGitConfig('user.email');
  }

  /**
   * Find GitHub Username
   *
   * Try to find GitHub Username via;
   * - sub-string of this.gitEmail()
   * - require(package.json).repository.url
   * - require(package.json).repository
   * - require(package.json).homepage.url
   * - require(package.json).homepage
   *
   * @returns {string}
   * @memberof Finda
   */
  githubUsername(gitEmail = this.gitEmail()): string {
    if (gitEmail.indexOf('@') !== -1 && gitEmail.indexOf('github') !== -1) {
      return gitEmail.substr(0, gitEmail.indexOf('@'));
    }
    let username = '';
    if (existsSync(pathResolve(this.packageJsonPath))) {
      const pkg = require(pathResolve(this.packageJsonPath));
      username = (
        (
          get(pkg, 'repository.url', pkg.repository) ||
          get(pkg, 'homepage.url', pkg.homepage) ||
          ''
        ).match(/github(?:\.com\/|\:)[^\/]+/g) || []
      )
      .join('')
      .replace(/github\.com\//g, '')
      .replace(/github\:/g, '');
    }
    if (get(username, 'length') >= 1) {
      return username;
    }
    return undefined;
  }

  /**
   * Find git name
   *
   * Try to find git name via;
   * - git config --get user.name
   *
   * @returns {string}
   * @memberof Finda
   */
  gitName(): string {
    return this.getFromGitConfig('user.name');
  }

  /**
   * Find package description
   *
   * Try to find package description via;
   * - require(package.json).description
   *
   * @param {string} [defaultValue=`A description for ${this.packageName()}`]
   * @returns {string}
   * @memberof Finda
   */
  packageDescription(defaultValue = `A description for ${this.packageName()}`): string {
    let description = this._getFromPackage('description', defaultValue);
    if (!get(description, 'length')) description = defaultValue;
    return description;
  }

  /**
   * Is current directory empty, or does it have a .git directory?
   *
   * @param {string} gitPath Path to .git directory
   * @returns {boolean}
   * @memberof Finda
   */
  isEmptyDirOrHasGit(gitPath: string = `${this.gitPath}`): boolean {
    return (emptyDirSync(process.cwd()) || existsSync(pathResolve(gitPath)));
  }

  /**
   * Find package destination
   *
   * Try to find package destination (directory or path) via;
   * - resolve path via parameter
   * - current directory
   *
   * @param {string} directoryOrPath
   * @returns {string}
   * @memberof Finda
   */
  packageDestination(directoryOrPath: string): string {
    return (this.isEmptyDirOrHasGit()) ? process.cwd() : pathResolve(directoryOrPath);
  }

  /**
   * Find package license
   *
   * Try to find package license via;
   * - require(package.json).license
   *
   * @param {string} [defaultValue='MIT']
   * @returns {string}
   * @memberof Finda
   */
  packageLicense(defaultValue = 'MIT'): string {
    let license = this._getFromPackage('license', defaultValue);
    license = (!get(license, 'length')) ? defaultValue : get(spdxCorrect(license), '0', '');
    if (!get(license, 'length')) license = defaultValue;
    return license;
  }

  /**
   * Find package name
   *
   * Try to find package name via;
   * - require(package.json).name
   *
   * @param {string} [defaultValue=`${this.userName()}-package`]
   * @returns {string}
   * @memberof Finda
   */
  packageName(defaultValue = `${this.username()}-package`): string {
    let name = this._getFromPackage('name', defaultValue);
    if (!get(name, 'length') && this.isEmptyDirOrHasGit()) {
      name = (process.cwd().match(/[^\/]+$/g) || [defaultValue]).join('');
    }
    return name;
  }

  /**
   * Find package repository URL
   *
   * Try to find package repository URL via;
   * - require(package.json).repository.url
   * - require(package.json).repository
   *
   * @param {*} [username=this.userName()]
   * @param {string} packageName
   * @returns {string}
   * @memberof Finda
   */
  packageRepository(username = this.username(), packageName?: string): string {
    if (!packageName) packageName = this.packageName(`${username}s-package`);
    const defaultValue = `https://github.com/${username}/${packageName}`;
    return this._getFromPackage('repository', defaultValue);
  }

  /**
   * Find package version
   *
   * Try to find package version via;
   * - require(package.json).version
   *
   * @param {string} [defaultVersion='0.0.0']
   * @returns {string}
   * @memberof Finda
   */
  packageVersion(defaultVersion = '0.0.0'): string {
    let version = this._getFromPackage('version', defaultVersion);
    if (!get(version, 'length')) version = defaultVersion;
    return version;
  }

  /**
   * Find username
   *
   * Try to find username via;
   * - require(package.json).repository.url
   * - require(package.json).repository
   * - require(package.json).homepage.url
   * - require(package.json).homepage
   * - require(package.json).author.email
   * - require(package.json).author
   *
   * @param {*} [defaultValue=this.githubUsername()]
   * @returns {string}
   * @memberof Finda
   */
  username(defaultValue = this.githubUsername()): string {
    if (typeof defaultValue !== 'undefined' && defaultValue !== '') {
      return defaultValue;
    }
    return userInfo().username;
  }

  /**
   * Get value from a property in package.json file
   *
   * @param {string} path
   * @param {*} [defaultValue]
   * @returns {*}
   * @memberof Finda
   */
  _getFromPackage(path: string, defaultValue?: any): any {
    const packagePath = pathResolve(this.packageJsonPath);
    if (existsSync(packagePath)) {
      return get(require(packagePath), path, defaultValue);
    }
    return defaultValue;
  }

}

export const finda = new Finda();

export default finda;
