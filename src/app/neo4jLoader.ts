import { searchGeneIds } from "./search";
import * as d3 from 'D3';
import { readdirSync } from "fs";

var neo4j = require('neo4j-driver').v1;
var driver = neo4j.driver("bolt://localhost:11001", neo4j.auth.basic("neo4j", "1234"));
var _ = require('lodash');

export async function addNode(queryOb:object, type:string){

     console.log('is this working',queryOb)
    let value = queryOb.value? queryOb.value : queryOb.dbSnps;
    let node = await checkForNode(value, type);
    if(node.length > 0){
        console.log('node exists', node);

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


export async function addNodeArray(phenoObs:Array<object>){
    let names: Array<string> = phenoObs.map(v=> v.name);
    let type = phenoObs[0].type;
    let originalNames : Array<string> = await checkForNodeArray(names, type);

    let newNames = names.filter(n=> originalNames.indexOf(n) == -1);
   
    if(newNames.length > 0){
        console.log('ADDING ARRAY')
        let newObs = phenoObs.filter(ob=> newNames.indexOf(ob.name) > -1)
        let newnew = newObs.map(o=> {
            let keys = d3.keys(o);
            keys.forEach(k=> {
                console.log(o[k], typeof o[k])
                if(typeof o[k] != 'string'){
                    JSON.stringify(o[k])
                }else{console.log('whaaa')}
            })
            return o;
        })
        
        console.log('new', newnew);
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
   // console.log(command);
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
    let command = 'MATCH (n:'+type+' {name: "' + name + '" }) UNWIND $props AS map SET n.' + prop + ' = map';
     
    var session = driver.session();

    session
        .run(command, {props: propValue})
        .then(function(result:any) {
            session.close();
        })
        .catch(function(error:any) {
            console.log(error);
        });
}

export async function getGraph() {
/*
    let command = 'MATCH (v, p)-[p:Mutation]->(g) \
    RETURN g AS gene, collect(v.name) AS variant, collect(p.name) AS phenotype';
*/
    let command = 'OPTIONAL MATCH (v)-[m:Mutation]->(g) \
    OPTIONAL MATCH (p)-[r:Pheno]->(v) \
    RETURN collect(v) AS variant, collect(p) AS phenotype, g AS gene, collect(r) AS phenoRel, collect(m) AS mutationRel'
                   
    var session = driver.session();

    return session
        .run(command)
        .then(function(result) {
            session.close();
     
            return result.records.map(r=> {
           
                let gene = new Array(r.get('gene')).map(g=> {
               
                    let gen = new Object();
                    gen.index = g.identity.low;
                    gen.title = g.properties.name;
                    gen.properties = g.properties;
                    gen.label = g.labels[0];
                    return  gen;
                });
                let vars = r.get('variant').map(v=> {
                    let vari = new Object();
                    vari.index = v.identity.low;
                    vari.title = v.properties.name;
                    vari.properties = v.properties;
                    vari.label = v.labels[0];
                    return vari;
                });
                let pheno = r.get('phenotype').map(p=> {
                    let ph = new Object();
                    ph.index = p.identity.low;
                    ph.title = p.properties.name;
                    ph.properties = p.properties;
                    ph.label = p.labels[0];
                    return ph;
                });

                let phenopaths = r.get('phenoRel').map(p=>{
                    let ph = new Object();
                    ph.start = p.start.low;
                    ph.end = p.end.low;
                    ph.index = p.identity.low;
                    ph.type = p.type;
                    return ph;
                });
                let mutationpaths = r.get('mutationRel').map(m=> {
                    let meh = new Object();
                    meh.start = m.start.low;
                    meh.end = m.end.low;
                    meh.index = m.identity.low;
                    meh.type = m.type;
                    return meh;
                });
        
                let nodes = gene.concat(vars, pheno);
                let relations = phenopaths.concat(mutationpaths);
                let indexArray = nodes.map(n=> n.index);
                let rels = relations.map(r=> {
                    var source = indexArray.indexOf(r.start);
                    var target = indexArray.indexOf(r.end);
                    return {'source': source, 'target': target}
                })
                return { nodes, links: rels };  
        });
    })
        .catch(function(error) {
            console.log(error);
        });


}

export async function addRelation(sourceName:string, sourceType:string, targetName:string, targetType:string, linkType:string) {
    
    let command = 'MATCH (a:'+sourceType+'),(b:'+targetType+') \
    WHERE a.name = "' + sourceName + '" AND b.name = "' + targetName + '"MERGE (a)-[r:'+linkType+']->(b) ON CREATE SET r.alreadyExisted=false ON MATCH SET r.alreadyExisted=true RETURN r.alreadyExisted';

    var session = driver.session();
    return session
        .run(command)
        .then(function(result) {
            session.close();
          //  console.log('pathway exists '+linkType+'?', result)
            return result;
        })
        .catch(function(error) {
            console.log(error);
        });
}