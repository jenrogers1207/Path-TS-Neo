var neo4j = require('neo4j-driver').v1;
var driver = neo4j.driver("bolt://localhost:11001", neo4j.auth.basic("neo4j", "1234"));
var _ = require('lodash');

export async function addToGraph(query:string, type:string) {
    let command = 'CREATE (n:' + type + ' {name:"' + query + '"})';
    console.log(command);
    var session = driver.session();
    session
        .run(command)
        .then(function(result) {
            session.close();
            checkForNode(query);
        })
        .catch(function(error:any) {
            console.log(error);
        });
}

export async function checkForNode(name:string) {
    var session = driver.session();
    let command = 'MATCH (n:Gene { name: "' + name + '" }) RETURN n';
    return session
        .run(command)
        .then(function(result:any) {
            session.close();
            return result.records;
        })
        .catch(function(error:any) {
            console.log(error);
        });
}

export function setNodeProperty(name:string, prop:string, propValue:string) {
    let command = 'MATCH (n:Gene { name: "' + name + '" }) SET n.' + prop + '= "' + propValue + '"';
    var session = driver.session();

    session
        .run(command)
        .then(function(result:any) {
            session.close();
        })
        .catch(function(error:any) {
            console.log(error);
        });
}

export async function getGraph() {

    let command = 'MATCH (g:Gene)-[p:path]->(a:Pathway) \
    RETURN g AS gene, collect(a.name) AS pathway';
    //(a)-[p:path]->(b)

    var session = driver.session();

    return session
        .run(command)
        .then(function(result) {
            session.close();
            var nodes = [],
                rels = [],
                i = 0;
            result.records.forEach(res => {

                nodes.push({ title: res.get('gene').properties.name, label: 'gene', data: res.get('gene').properties });
                var target = i;
                i++;

                res.get('pathway').forEach(name => {
                    var path = { title: name, label: 'pathway' };
                    var source = _.findIndex(nodes, path);
                    if (source == -1) {
                        nodes.push(path);
                        source = i;
                        i++;
                    }
                    rels.push({ source, target });
                });
            });

            return { nodes, links: rels };
            // });
            //    return nodes;
        })
        .catch(function(error) {
            console.log(error);
        });
}

export async function addRelation(name, pathName) {

    let command = 'MATCH (a:Gene),(b:Pathway) WHERE a.name = "' + name + '" AND b.name = "' + pathName + '" CREATE (a)-[p:path]->(b) RETURN p';
    var session = driver.session();
    return session
        .run(command)
        .then(function(result) {
            session.close();
            return nodes;
        })
        .catch(function(error) {
            console.log(error);
        });
}