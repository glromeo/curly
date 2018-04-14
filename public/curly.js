'use strict';

var curly = angular.module('curly', [
    'ngRoute',
    'curly.main'
]);

curly.config(['$locationProvider', '$routeProvider', function ($locationProvider, $routeProvider) {
    $locationProvider.hashPrefix('!');
    $routeProvider.otherwise({redirectTo: '/main'});
}]);