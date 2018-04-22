'use strict';

var main = angular.module('curly.main', ['ngSanitize', 'ngRoute']);

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
    };

    $scope.contentType = null;
    $scope.parameters = [];
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

    ["curl.verb", "curl.url", "curl.headers", "curl.options", "curl.fields"].forEach((expression) => {
        $scope.$watch(expression, (newVal, oldVal) => {
            if (newVal && (newVal !== oldVal)) updateSampleCurl();
        }, true);
    });

    function updateSampleCurl() {
        let headers = curl.headers.filter(header => header && header.name).map(header => {
            return '-H "' + header.name + ": " + (header.value || '') + '"';
        });
        if (!curl.url) {
            $scope.$root.sampleCurlLine = '';
            return;
        }

        let options = Object.keys(curl.options).filter(name => curl.options[name]);

        let fields = curl.fields.map(field => {
            return '-F "' + field.name + "=" + encodeURIComponent(field.value || '') + '"';
        });

        $scope.$root.sampleCurlLine = "curl -X " + curl.verb.name
            + " " + headers.join(" ")
            + " " + options.join(" ")
            + " " + fields.join(" ")
            + " " + curl.url;
    }

    $scope.isLocationValid = function () {
        let anchor = document.getElementById('locationAnchor');
        return anchor.protocol && anchor.hostname || anchor.search;
    };
}]);

main.controller('ParametersController', ['$scope', '$http', function ($scope, $http) {

    $scope.addParameter = function (parameter) {
        $scope.$parent.parameters.push(parameter);
    };

    $scope.removeParameter = function (parameter) {
        $scope.$parent.parameters.splice($scope.$parent.parameters.indexOf(parameter));
    };

    $scope.$watch("curl.url", function (url) {
        let anchor = document.getElementById('locationAnchor');
        if (anchor.search) {
            let encodedParameters = anchor.search.substring(1).split("&");
            $scope.$parent.parameters = encodedParameters.map(p => {
                let split = p.split('=');
                return {name: split[0], value: decodeURIComponent(split[1])};
            });
        }
    });

    $scope.save = function () {
        let anchor = document.getElementById('locationAnchor');
        anchor.search = '?';
        $scope.$parent.parameters.forEach(p => {
            anchor.search += encodeURIComponent(p.name) + "=" + encodeURIComponent(p.value);
        });
        $scope.curl.url = anchor.href;
    };
}]);


main.controller('FormBodyController', ['$scope', '$http', function ($scope, $http) {

    let curl = $scope.curl;

    curl.fields = [];

    $scope.addField = function (parameter) {
        curl.fields.push(parameter);
    };

    $scope.removeField = function (parameter) {
        curl.fields.splice($scope.fields.indexOf(parameter));
    };
}]);

main.controller('HeadersController', ['$scope', '$http', function ($scope, $http) {

    $scope.newHeader = {};

    $http.get('data/headers.json').then(response => {
        $scope.headers = response.data;
    });

    $scope.setHeader = function (header) {
        $scope.newHeader = Object.assign({}, header);
    };

    $scope.addHeader = function (header) {
        $scope.curl.headers.push(header);
        if (header.name === 'Content-Type') {
            $scope.$parent.contentType = header.value;
        }
        $scope.newHeader = {};
    };

    $scope.removeHeader = function (header) {
        $scope.$parent.contentType = null;
        $scope.curl.headers.splice($scope.curl.headers.indexOf(header));
    };

    $scope.selectAll = function ($event) {
        $($event.target).select();
    };

    $scope.isValidHeader = function (newHeader) {
        if (newHeader && newHeader.name) {
            let found = $scope.curl.headers.find(header => header.name === newHeader.name);
            return found === undefined;
        }
    };

    $scope.setContentType = function (value) {
        $scope.addHeader({
            name: 'Content-Type', value: value
        });
    };

}]);

main.controller('OptionsController', ['$scope', '$http', function ($scope, $http) {

    $scope.curl.options = {};

    let regExp;

    $scope.$watch("search", function (search) {
        regExp = search ? new RegExp($scope.search, 'i') : null;
    });

    $scope.searchOption = function (option) {
        return regExp ? regExp.test(option.name) || regExp.test(option.description.text()) : true;
    };
}]);


main.filter('highlight', ['$sce', function ($sce) {
    let pattern, regExp;
    return function (text, search) {
        if (search && search.length > 2) {
            if (pattern !== search) {
                regExp = new RegExp('(' + search + ')', 'gi');
                pattern = search;
            }
            if (text instanceof jQuery) {
                text = text.clone();
                text.children().each(function () {
                    $(this).contents().each(function () {
                        if (this.nodeType === 3) {
                            $(this).replaceWith($("<span>" + this.nodeValue.replace(regExp, '<span class="bg-warning">$1</span>') + "</span>").html());
                        }
                    });
                });
                return $sce.trustAsHtml("<span>" + text.html() + "</span>");
            } else {
                text = text.replace(regExp, '<span class="bg-warning">$1</span>');
                return $sce.trustAsHtml("<span>" + text + "</span>");
            }
        } else {
            if (text instanceof jQuery) {
                return $sce.trustAsHtml("<span>" + text.html() + "</span>");
            } else {
                return $sce.trustAsHtml("<span>" + text + "</span>");
            }
        }
    }
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
                        description: $("<span>")
                    };
                    while (index < siblings.length) {
                        while (index < siblings.length) {
                            firstElementChild = siblings[index].firstElementChild;
                            if (firstElementChild && firstElementChild.hasAttribute("name")) {
                                option = {
                                    name: firstElementChild.getAttribute("name"),
                                    html: firstElementChild.innerHTML,
                                    description: $("<span>")
                                };
                                index++;
                                break;
                            }
                            option.description.append(siblings[index]);
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

main.controller('BodyController', ['$scope', '$element', '$http', function ($scope, $element, $http) {
    var editor = ace.edit($element[0]);
    editor.setTheme("ace/theme/chrome");
    editor.session.setMode("ace/mode/json");
}]);
