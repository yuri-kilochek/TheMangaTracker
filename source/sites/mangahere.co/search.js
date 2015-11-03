'use strict';

define([
    './languageSpecifics.js', '/utility/AsyncStream.js', '/utility/http.js', 'jquery'
], (   languageSpecifics    ,           AsyncStream    ,           http    ,   $     ) => {
    function search(query) {
        function searchInLanguage(language) {
            let languageSpecific = languageSpecifics[language];

            return http.get('http://' + languageSpecific.subdomain + '.mangahere.co/advsearch.htm')
                .map(document => {
                    let form = $(document).find('#searchform').clone();
                    
                    if (query.title !== '') {
                        form.find('input[name="name"]').val(query.title); 
                    }

                    if (query.writer !== '') {
                        form.find('input[name="author"]').val(query.writer); 
                    }

                    if (query.artist !== '') {
                        form.find('input[name="artist"]').val(query.artist); 
                    }

                    if (query.complete !== null) {
                        form.find('input[name="is_completed"]').val([query.complete ? 1 : 0]);
                    }

                    if (query.readingDirection === '<') {
                        form.find('input[name="direction"]').val(['rl']); 
                    } else if (query.readingDirection === '>') {
                        form.find('input[name="direction"]').val(['lr']); 
                    }

                    return http.get(form.prop('action') + '?' + form.serialize());
                }).chain()
                .skipIf(document => $(document).find('.result_search .directory_footer').length === 0)  // nothing found
                .map(function extractResults(document) {
                    let results = $(document).find('.result_search');
                    let fromFirstPage = AsyncStream.from(results.find('.manga_info').toArray().map(a => a.href))
                        .map(uri => {
                            let name = /\/([^\/]+)\/$/.exec(uri)[1];
                            return language + '.' + name;
                        })
                    ;
                    let fromOtherPages = AsyncStream.from(results.find('.next').toArray().map(a => a.href))
                        .map(http.get).chain()
                        .map(extractResults).chain()
                    ;
                    return fromFirstPage.chain(fromOtherPages);
                }).chain()
            ;
        }

        return AsyncStream.from(Object.keys(languageSpecifics))
            .keepIf(language => query.languages.has(language))
            .map(searchInLanguage).join()
        ;
    }

    return search;
});
