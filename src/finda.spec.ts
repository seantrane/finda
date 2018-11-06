import { assert, expect, should } from 'chai';
import * as fs from 'fs-extra';
import * as mocha from 'mocha';
import * as path from 'path';

import { Finda } from './finda';

describe('Yo Repo Finda', function() {

  let finda: Finda;

  beforeEach(function() {
    finda = new Finda();
    finda.resetPackageJsonPath(path.join(__dirname, '../package.json'));
  });

  describe('Finda class', function() {

    it('should have expected methods and properties', function() {
      expect(finda).to.have.property('packageJsonPath');
      expect(finda).to.respondTo('resetPackageJsonPath');
    });

    it('should have default value for packageJsonPath property', function() {
      expect(finda.packageJsonPath).to.include('package.json');
    });

    it('should reset packageJsonPath property', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.packageJsonPath).to.include('missing.json');
    });

    it('should reset packageJsonPath property to default', function() {
      expect(finda.packageJsonPath).to.include('package.json');
    });

  });

  describe('_getFromPackage function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('_getFromPackage');
    });

    it('should find name property from package.json', function() {
      expect(finda._getFromPackage('name')).to.equal('finda');
    });

    it('should return a default value when property is not found', function() {
      expect(finda._getFromPackage('xyz23', 'default')).to.equal('default');
    });

    it('should return a default value when package.json does not exist', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda._getFromPackage('name', 'default')).to.equal('default');
    });

  });

  describe('authorName function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('authorName');
    });

    it('should find author.name property from package.json', function() {
      expect(finda.authorName()).to.be.a('string');
    });

    it('should find author name property from ~/.gitconfig', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.authorName()).to.be.a('string');
    });

  });

  describe('authorEmail function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('authorEmail');
    });

    it('should finda author.email property from package.json', function() {
      expect(finda.authorEmail()).to.include('.com');
    });

    it('should find author email property from ~/.gitconfig', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.authorEmail()).to.include('.com');
    });

  });

  describe('authorUrl function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('authorUrl');
    });

    it('should find author.url property from package.json', function() {
      expect(finda.authorUrl()).to.be.a('string');
    });

  });

  describe('gitEmail function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('gitEmail');
    });

    it('should find the git user email address', function() {
      expect(finda.gitEmail()).to.be.a('string');
      // Check again to trigger cache
      expect(finda.gitEmail()).to.be.a('string');
    });

  });

  describe('githubUsername function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('githubUsername');
    });

    it('should find the GitHub username', function() {
      expect(finda.githubUsername()).to.be.a('string');
    });

    it('should find the GitHub username', function() {
      expect(finda.githubUsername('test@domain.com')).to.be.equal(undefined);
    });

  });

  describe('gitName function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('gitName');
    });

    it('should find the git user name', function() {
      expect(finda.gitName()).to.be.a('string');
      // Check again to trigger cache
      expect(finda.gitName()).to.be.a('string');
    });

  });

  describe('packageDescription function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('packageDescription');
    });

    it('should find description property from package.json', function() {
      expect(finda.packageDescription()).to.include('Finda');
      expect(finda.packageDescription()).to.include('utility');
    });

    it('should return a default value when package.json does not exist', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.packageDescription('default')).to.equal('default');
      expect(finda.packageDescription('')).to.equal('');
    });

  });

  describe('packageDestination function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('packageDestination');
    });

    it('should find destination directory for the repo/package', function() {
      expect(finda.packageDestination('./')).to.include('/');
    });

  });

  describe('packageLicense function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('packageLicense');
    });

    it('should find license property from package.json', function() {
      expect(finda.packageLicense()).to.equal('M');
    });

    it('should return a default value when package.json does not exist', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.packageLicense('MIT')).to.equal('M');
      expect(finda.packageLicense('')).to.equal('');
    });

  });

  describe('packageName function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('packageName');
    });

    it('should find name property from package.json', function() {
      expect(finda.packageName()).to.include('finda');
    });

    it('should return a default value when package.json does not exist', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.packageName('default')).to.equal('default');
    });

    it('should return current directory when path and package.json does not exist', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.packageName('')).to.include('finda');
    });

  });

  describe('packageRepository function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('packageRepository');
    });

    it('should find repository property from package.json', function() {
      expect(finda.packageRepository()).to.include('finda');
    });

    it('should return a default value when package.json does not exist', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.packageRepository('default')).to.include('default');
      expect(finda.packageRepository('')).to.include('-package');
      expect(finda.packageRepository('profile', 'repo')).to.include('profile/repo');
    });

  });

  describe('packageVersion function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('packageVersion');
    });

    it('should find version property from package.json', function() {
      expect(finda.packageVersion()).to.match(/\d+\.\d+\.\d+\-?[\w\d\_\-\.]*/);
    });

    it('should return a default value when package.json does not exist', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.packageVersion('0.0.0-development')).to.equal('0.0.0-development');
      expect(finda.packageVersion('')).to.equal('');
    });

  });

  describe('username function', function() {

    it('should exist', function() {
      expect(finda).to.respondTo('username');
    });

    it('should find a username', function() {
      expect(finda.username()).to.be.a('string');
    });

    it('should find something when package.json does not exist', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.username()).to.be.a('string');
      expect(finda.username('')).to.be.a('string');
    });

    it('should use specified username when package.json does not exist', function() {
      finda.resetPackageJsonPath('missing.json');
      expect(finda.username('testuser')).to.equal('testuser');
    });

  });

});
