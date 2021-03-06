'use strict';

const path = require('path');
const SERVERLESS_PATH = path.join(process.cwd(), 'node_modules', 'serverless', 'lib');

const Serverless = require(path.join(SERVERLESS_PATH, 'Serverless')),
  s = new Serverless(),
  chai = require('chai'),
  should = chai.should(),
  chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const CorsPlugin = require('..')(
  require(path.join(SERVERLESS_PATH, 'ServerlessPlugin')),
  SERVERLESS_PATH
);

describe('ServerlessCors', function() {
  describe('#getName()', function() {
    it('should return the correct name', function() {
      CorsPlugin.getName().should.equal('com.joostfarla.ServerlessCors');
    });
  });

  describe('#registerHooks()', function() {
    it('should register hooks', function() {
      s.addPlugin(new CorsPlugin(s));
      s.hooks.endpointBuildApiGatewayPre.should.have.length(1);
      s.hooks.endpointBuildApiGatewayPre[0].name.should.equal('bound addCorsHeaders');
      s.hooks.endpointDeployPost.should.have.length(1);
      s.hooks.endpointDeployPost[0].name.should.equal('bound addPreflightRequests');
    });
  });

  describe('#addCorsHeaders()', function() {
    it('should not add any headers when cors is not configured', function(done) {
      let plugin = new CorsPlugin(s);

      plugin.addCorsHeaders({
        endpoint: {
          module: { custom: {} },
          function: { custom: {} },
          responses: {
            default: { statusCode: '200', responseParameters: { 'Some-Header': 'Some-Value' } }
          }
        }
      }).then(function(evt) {
        let headers = evt.endpoint.responses.default.responseParameters;
        headers['Some-Header'].should.equal('Some-Value');
        headers.should.not.contain.key('method.response.header.Access-Control-Allow-Origin');
        done();
      })
    });

    it('should fail when "allowOrigin" setting is missing', function() {
      let plugin = new CorsPlugin(s);

      plugin.addCorsHeaders({
        endpoint: {
          module: { custom: {} },
          function: { custom: { cors: {} }},
          responses: {}
        }
      }).should.be.rejected;
    });

    it('should fail when "allowOrigin" setting is invalid', function() {
      let plugin = new CorsPlugin(s);

      plugin.addCorsHeaders({
        endpoint: {
          module: { custom: {} },
          function: { custom: { cors: {
            allowOrigin: true,
          }}},
          responses: {}
        }
      }).should.be.rejected;
    });

    it('should fail when "allowHeaders" setting is invalid', function() {
      let plugin = new CorsPlugin(s);

      plugin.addCorsHeaders({
        endpoint: {
          module: { custom: {} },
          function: { custom: { cors: {
            allowOrigin: '*',
            allowHeaders: 'Value-That-Is-Not-An-Array'
          }}},
          responses: {}
        }
      }).should.be.rejected;
    });

    it('should add an "Access-Control-Allow-Origin" header when "allowOrigin" is set', function(done) {
      let plugin = new CorsPlugin(s);

      plugin.addCorsHeaders({
        endpoint: {
          module: { custom: {} },
          function: { custom: {
            cors: { allowOrigin: '*', allowHeaders: ['Header-X', 'Header-Y'] }
          }},
          responses: {
            default: { statusCode: '200' }
          }
        }
      }).then(function(evt) {
        let headers = evt.endpoint.responses.default.responseParameters;
        headers['method.response.header.Access-Control-Allow-Origin'].should.equal('\'*\'');
        headers.should.not.contain.key('method.response.header.Access-Control-Allow-Methods');
        headers.should.not.contain.key('method.response.header.Access-Control-Allow-Headers');
        headers.should.not.contain.key('method.response.header.Access-Control-Allow-Credentials');
        headers.should.not.contain.key('method.response.header.Access-Control-Expose-Headers');
        headers.should.not.contain.key('method.response.header.Access-Control-Max-Age');
        done();
      })
    });

    it('should add an "Access-Control-Allow-Credentials" header to GET function when "allowCredentials" is set', function(done) {
      let plugin = new CorsPlugin(s);

      plugin.addCorsHeaders({
        endpoint: {
          method: 'GET',
          module: { custom: {} },
          function: { custom: {
            cors: { allowOrigin: 'http://function.test', allowCredentials: true }
          }},
          responses: {
            default: { statusCode: '200' }
          }
        }
      }).then(function(evt) {
        let headers = evt.endpoint.responses.default.responseParameters;
        headers['method.response.header.Access-Control-Allow-Credentials'].should.equal('\'true\'');
        done();
      })
    });

    it('should preserve existing headers when cors is configured for function', function(done) {
      let plugin = new CorsPlugin(s);

      plugin.addCorsHeaders({
        endpoint: {
          module: { custom: {} },
          function: { custom: {
            cors: { allowOrigin: '*', allowHeaders: ['Header-X', 'Header-Y'] }
          }},
          responses: {
            default: { statusCode: '200', responseParameters: { 'Some-Header': 'Some-Value' } }
          }
        }
      }).then(function(evt) {
        let headers = evt.endpoint.responses.default.responseParameters;
        headers['Some-Header'].should.equal('Some-Value');
        headers['method.response.header.Access-Control-Allow-Origin'].should.equal('\'*\'');
        headers.should.not.contain.key('method.response.header.Access-Control-Allow-Methods');
        headers.should.not.contain.key('method.response.header.Access-Control-Allow-Headers');
        done();
      })
    });
  });

  describe('#addPreflightRequests()', function() {
    // @todo write test after https://github.com/serverless/serverless/issues/441 is fixed
  });
});
