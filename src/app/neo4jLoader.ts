import { searchGeneIds } from "./search";
import * as d3 from 'D3';

var neo4j = require('neo4j-driver').v1;
var driver = neo4j.driver("bolt://localhost:11001", neo4j.auth.basic("neo4j", "1234"));
var _ = require('lodash');

export async function addNode(queryOb:object, type:string){
    let value = queryOb.value? queryOb.value : queryOb.dbSnps;
    let node = await checkForNode(value, type);
    if(node.length > 0){
        console.log('node exists');
        console.log('existing node', node);

    }else{
        console.log('add node');
     
        let name = queryOb.value ? queryOb.value : queryOb.name;
        let prop = {};

        let properties = queryOb.properties ? queryOb.properties : queryOb;

        let idKeys = d3.keys(queryOb.properties.ids);
       
        let propKeys = d3.keys(properties).filter(f=> f != 'ids');

        propKeys.forEach(el => {
            prop[el] = typeof properties[el] === 'string' ? properties[el] : JSON.stringify(properties[el]);
        });

        idKeys.forEach((id, i)=> {
           // console.log(id, properties.ids[id])
            prop[id] = properties.ids[id];
        })

        prop.name = name;
 
       // let command = 'CREATE (n:' + queryOb.type + ' {name:"' + queryOb.value + '"})';
        let command = `CREATE (n:`+type+` $props)`;
      //  console.log(command, {props: properties});
        var session = driver.session();
        session
            .run(command, {props: prop})
            .then(function(result) {
                session.close();
                console.log("adding to graph");
            })
            .catch(function(error:any) {
                console.log(error);
            });
        }
    }

//NEED TO CHANGE THIS NAME
export async function addNodeArray(phenoObs:Array<object>){
    let names: Array<string> = phenoObs.map(v=> v.phenotype);
    let type = phenoObs[0].type;
    let originalNames : Array<string> = await checkForNodeArray(names, type);

    let newNames = names.filter(n=> originalNames.indexOf(n) == -1);
    console.log('phenoObs',phenoObs);
    if(newNames.length > 0){
        console.log('ADDING ARRAY')
        let newObs = phenoObs.filter(ob=> newNames.indexOf(ob.phenotype) > -1)
        let command = 'UNWIND $props AS map CREATE (n:'+type+') SET n = map'
   
        var session = driver.session();
        session
            .run(command, {props: newObs})
            .then(function(result) {
                session.close();

            console.log("adding to graph");
            })
            .catch(function(error:any) {
                console.log(error);
            });
        }else{ console.log('ALREADY THERE')}
}


export async function addToGraph(query:string, type:string) {
    let command = 'CREATE (n:' + type + ' {name:"' + query + '"})';
    console.log(command);
    var session = driver.session();
    session
        .run(command)
        .then(function(result) {
            session.close();
            console.log("adding to graph");
        })
        .catch(function(error:any) {
            console.log(error);
        });

}

export async function checkForNode(name:string, type:string) {
    var session = driver.session();
    let command = 'MATCH (n:'+type+' { name: "' + name + '" }) RETURN n';
    
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

export async function checkForNodeArray(names:Array<string>, type:string) {
    let command = 'UNWIND $vars as val MATCH (n:'+type+' {name: val}) RETURN n.name'
    var session = driver.session();
    
    return session
        .run(command, {vars: names})
        .then(function(result) {
            session.close();
            let resultArray = result.records.map(res => {
                return res.get('n.name');
            });
            return resultArray;
        })
        .catch(function(error:any) {
            console.log(error);
        });
}

export function setNodeProperty(type: string, name:string, prop:string, propValue:string) {
    //
    let command = 'MATCH (n:"'+type+'"{name: "' + name + '" }) SET n.' + prop + '= "' + propValue + '"';
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

    let command = 'MATCH (v:Variant)-[p:Mutation]->(g:Gene) \
    RETURN g AS gene, collect(v.name) AS variant';
    //(a)-[p:path]->(b)

  //  let command = 'RETURN *'

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

                res.get('variant').forEach(name => {
                  
                    var path = { title: name, label: 'variant' };
                    var source = _.findIndex(nodes, path);
                    if (source == -1) {
                        nodes.push(path);
                        source = i;
                        i++;
                    }
                    rels.push({ source, target });
                });
            });
            console.log(nodes, rels)
            return { nodes, links: rels };
          
        })
        .catch(function(error) {
            console.log(error);
        });
}

export async function addRelation(sourceName:string, sourceType:string, targetName:string, targetType:string, linkType:string) {
    
    let command = 'MATCH (a:'+sourceType+'),(b:'+targetType+') WHERE a.name = "' + sourceName + '" AND b.name = "' + targetName + '" CREATE (a)-[p:'+linkType+']->(b) RETURN p';
    
    var session = driver.session();
    return session
        .run(command)
        .then(function(result) {
            session.close();
            return result;
        })
        .catch(function(error) {
            console.log(error);
        });
}