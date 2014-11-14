(function() {
  'use strict';

  angular.module('hansei.routes', ['ui.router']);

  angular.module('hansei.services', [
      'hansei.routes',
      'ngSails',
      'LocalStorageModule',
      'angular-lodash/utils/pluck',
      'angular-lodash/utils/flatten',
      'angular-lodash/utils/sortBy',
    ]).config(['$stateProvider', 'appStateDefaults', '$urlRouterProvider', 'routes', 'localStorageServiceProvider',
      function($stateProvider, appStateDefaults, $urlRouterProvider, routes, localStorageServiceProvider) {

        localStorageServiceProvider.setPrefix('niftyboard');

        angular.forEach(routes, function(stateConfig, key) {
          $stateProvider.state(key,
            angular.extend(angular.copy(appStateDefaults), stateConfig));
        });

        $urlRouterProvider.otherwise('/boards');
      }
    ])

    .run(['$rootScope', '$sails', '$state', 'user', 'api',
      function($rootScope, $sails, $state, user, api) {

        var initialSetup = function() {
          // This clues the api library into the status of the initial token setup
          // so that it can defer any calls until after the websocket session is
          // authenticated.
          user.resetInitialTokenPromise();

          if (!user.token()) {
            $rootScope.$on('$stateChangeSuccess', function(event, next) {
              return $state.go('signin');
            });
            return;
          }

          // We have a token in local storage, so let's reauthenticate with it for
          // this fresh websocket connection.
          user.initialRefreshToken();
        };

        initialSetup();

        $sails.on('reconnect', function() {
          initialSetup();
          api.resubscribe();
        });

      }
    ]);

  angular.module('hansei.ui', ['hansei.services', 'xeditable', 'ang-drag-drop'])

  .run(['editableOptions', function(editableOptions) {
    editableOptions.theme = 'bs3';
  }]);

  angular.module('hansei', ['hansei.ui'])
    .config(['$locationProvider', function($locationProvider) {
      $locationProvider
        .html5Mode({enabled: true, requireBase: false})
        .hashPrefix('!');
    }]);
})();
