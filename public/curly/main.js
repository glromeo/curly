'use strict';

var main = angular.module('curly.main', ['ngRoute']);

main.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/main', {
        templateUrl: 'curly/main.html',
        controller: 'MainController'
    });
}]);

main.controller('MainController', ['$scope', function ($scope) {

    $scope.autocomplete = {};

    Papa.parse("data/media-types.csv", {
        download: true,
        complete: function (csv) {
            $scope.autocomplete["media-type"] = csv.data.map(row => {
                return {description: row[0], value: row[1], ext: row[2]}
            }).sort((lt, rt) => lt.value.localeCompare(rt.value));
            $scope.$apply();
        }
    });

    $scope.openDropdown = function ($event) {

        $($event.target).parent().trigger($.Event("show.bs.dropdown", {
            relatedTarget: $event.target
        }));
    }

}]);

main.controller('CurlController', ['$scope', '$http', function ($scope, $http) {

    var curl = $scope.$parent.curl = this;

    curl.verbs = [
        {name: 'GET', ngClass: 'success'},
        {name: 'OPTIONS', ngClass: 'secondary'},
        {name: 'HEAD', ngClass: 'info'},
        {name: 'PUT', ngClass: 'primary'},
        {name: 'POST', ngClass: 'warning'},
        {name: 'DELETE', ngClass: 'danger'}
    ];
    curl.verb = curl.verbs[0];

    curl.headers = [];

    ["curl.verb", "curl.url", "curl.headers", "curl.options"].forEach((expression) => {
        $scope.$watch(expression, (newVal, oldVal) => {
            if (newVal && (newVal !== oldVal)) updateSampleCurl();
        }, true);
    });

    function updateSampleCurl() {
        var headers = curl.headers.filter(header => header && header.name).map(header => {
            return '-H "' + header.name + ": " + (header.value || '') + '"';
        });
        if (!curl.url) {
            $scope.$root.sampleCurlLine = '';
            return;
        }

        let options = Object.keys(curl.options).filter(name => curl.options[name]);

        $scope.$root.sampleCurlLine = "curl -X " + curl.verb.name + " " + headers.join(" ") + " " + options.join(" ") + " " + curl.url;
    }

}]);

main.controller('HeadersController', ['$scope', '$http', function ($scope, $http) {

    $http.get('data/headers.json').then(response => {
        $scope.headers = response.data;
    });

    $scope.addHeader = function (header) {
        $scope.newHeader = Object.assign({}, header);
    };

    $scope.selectAll = function ($event) {
        $($event.target).select();
    };

    $scope.isValidHeader = function (newHeader) {
        if (newHeader && newHeader.name) {
            let found = $scope.curl.headers.find(header => header.name === newHeader.name);
            return found === undefined;
        }
    }

}]);

main.controller('OptionsController', ['$scope', '$http', function ($scope, $http) {
    $scope.curl.options = {};
}]);

main.controller('OptionDescription', ['$scope', '$element', function ($scope, $element) {
    $element.html($scope.option.description.map(e => e.innerHTML).join(" "));
}]);

main.controller('CurlManual', ['$scope', '$element', '$http', function ($scope, $element, $http) {

    $http.get('data/curl.html').then(response => {

        let $man = $(response.data);
        let man = {};
        $man.find('h2.nroffsh').each(function () {
            let $heading = $(this);
            let heading = $heading.text().toLowerCase();
            let siblings = $heading.nextUntil('h2.nroffsh');
            let content;
            switch (heading) {
                case 'options':
                    content = {
                        description: [],
                        list: []
                    };
                    let index = 0, firstElementChild;
                    while (index < siblings.length) {
                        firstElementChild = siblings[index].firstElementChild;
                        if (firstElementChild && firstElementChild.hasAttribute("name")) {
                            break;
                        }
                        content.description.push(siblings[index]);
                        index++;
                    }
                    let option = {
                        name: firstElementChild.getAttribute("name"),
                        html: firstElementChild.innerHTML,
                        description: []
                    };
                    while (index < siblings.length) {
                        while (index < siblings.length) {
                            firstElementChild = siblings[index].firstElementChild;
                            if (firstElementChild && firstElementChild.hasAttribute("name")) {
                                option = {
                                    name: firstElementChild.getAttribute("name"),
                                    html: firstElementChild.innerHTML,
                                    description: []
                                };
                                index++;
                                break;
                            }
                            option.description.push(siblings[index]);
                            index++;
                        }
                        content.list.push(option);
                    }
                    break;
                default:
                    content = siblings.map(function () {
                        return this.innerHTML;
                    });
            }
            man[heading] = content;
        });

        $scope.$parent.man = man;
    });

}]);