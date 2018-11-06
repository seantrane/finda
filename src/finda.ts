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
  packageJsonPath: string;

  constructor() {
    this.resetPackageJsonPath();
    this.cache = new Map();
  }

  resetPackageJsonPath(value = 'package.json') {
    this.packageJsonPath = value;
  }

  /**
   * Finda author name
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
    if (!get(name, 'length')) {
      name = this.gitName();
    }
    if (!get(name, 'length')) {
      name = startCase(this.username());
    }
    return name;
  }

  /**
   * Finda author email
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
    if (!get(email, 'length')) {
      email = this.gitEmail();
    }
    if (!get(email, 'length')) {
      email = defaultEmail || `${userInfo().username}@${hostname()}`;
    }
    return email;
  }

  /**
   * Finda author URL
   *
   * Try to find author URL via;
   * - require(package.json).author.url
   *
   * @param {*} [username=this.userName()]
   * @param {string} [defaultValue]
   * @returns {string}
   * @memberof Finda
   */
  authorUrl(username = this.username(), defaultValue?: string): string {
    const author = this._getFromPackage('author.name', this._getFromPackage('author', null));
    let url = this._getFromPackage('author.url', defaultValue);
    if (isString(author) && typeof url === 'undefined') {
      url = (author.match(/\([^\<\>]+(?=\))/g) || []).join('').substr(1);
    }
    if (!get(url, 'length')) url = `https://github.com/${username}`;
    return url;
  }

  /**
   * Finda git email address
   *
   * Try to find git email address via;
   * - git config --get user.email
   *
   * @returns {string}
   * @memberof Finda
   */
  gitEmail(): string {
    const cacheKey = 'gitEmail_' + process.cwd();
    let email = this.cache.get(cacheKey);
    if (email) {
      return email;
    }
    // let config = gitConfigSync();
    // if (typeof config === 'undefined') config = gitConfigSync({ path: '~/.gitconfig' });
    // email = (typeof config.user !== 'undefined') ? config.user.email : null;
    if (shWhich('git')) {
      email = shExec('git config --get user.email', { silent: true }).stdout.toString().trim();
      this.cache.set(cacheKey, email);
    }
    return email;
  }

  /**
   * Finda GitHub Username
   *
   * Try to find GitHub Username via;
   * - sub-string of this.gitEmail()
   *
   * @returns {string}
   * @memberof Finda
   */
  githubUsername(gitEmail = this.gitEmail()): string {
    if (gitEmail.indexOf('@') !== -1 && gitEmail.indexOf('github') !== -1) {
      return gitEmail.substr(0, gitEmail.indexOf('@'));
    }
    return undefined;
  }

  /**
   * Finda git name
   *
   * Try to find git name via;
   * - git config --get user.name
   *
   * @returns {string}
   * @memberof Finda
   */
  gitName(): string {
    const cacheKey = 'gitName_' + process.cwd();
    let name = this.cache.get(cacheKey);
    if (name) {
      return name;
    }
    // let config = gitConfigSync();
    // if (typeof config === 'undefined') config = gitConfigSync({ path: '~/.gitconfig' });
    // name = (typeof config.user !== 'undefined') ? config.user.name : null;
    if (shWhich('git')) {
      name = shExec('git config --get user.name', { silent: true }).stdout.toString().trim();
      this.cache.set(cacheKey, name);
    }
    return name;
  }

  /**
   * Finda package description
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
   * Finda package destination
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
    if (emptyDirSync(process.cwd()) || existsSync(pathResolve('.git'))) {
      return process.cwd();
    }
    return pathResolve(directoryOrPath);
  }

  /**
   * Finda package license
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
   * Finda package name
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
    if (!get(name, 'length')) {
      if (emptyDirSync(process.cwd()) || existsSync(pathResolve('.git'))) {
        name = (process.cwd().match(/[^\/]+$/g) || [defaultValue]).join('');
      }
    }
    return name;
  }

  /**
   * Finda package repository URL
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
   * Finda package version
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
   * Finda username
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
        .substr(11);
    }
    if (username.length >= 1) {
      return username;
    }
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
