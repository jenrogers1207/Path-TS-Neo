import { searchGeneIds } from "./search";
import * as d3 from 'D3';
import { readdirSync } from "fs";

var neo4j = require('neo4j-driver').v1;
var driver = neo4j.driver("bolt://localhost:7687", neo4j.auth.basic("neo4j", "123"));
var _ = require('lodash');

export async function addLabel(node:object){

    let command = 'MATCH (n {name:"'+node.name+'"}) SET n:'+node.type+' RETURN n';
    var session = driver.session();
            session
                .run(command)
                .then(function(result) {

                    console.log('reselt', result);
                    session.close();
                    console.log("adding to graph");
                })
                .catch(function(error:any) {
                    console.log(error);
                });
                
    return node;
}

export async function setProperties(node:object){
    
    let prop = {};

    console.log('node insetprops', node);
       
    let propKeys = d3.keys(node.properties);

    propKeys.forEach(el => {
        prop[el] = typeof node.properties[el] === 'string' ? node.properties[el] : JSON.stringify(node.properties[el]);
    });

    prop.name = node.name;
    prop.type = node.type;

    let command = 'MATCH (n {name:"'+node.name+'"}) SET n += $props RETURN n';
    var session = driver.session();
            session
                .run(command, {props: prop})
                .then(function(result) {

                    console.log('reselt', result);
                    session.close();
                    console.log("adding to graph");
                })
                .catch(function(error:any) {
                    console.log(error);
                });
                
    return node;
}

export async function addNode(promOb:object, type:string){

    let queryOb = await Promise.resolve(promOb);
    let value = queryOb.name? queryOb.name : queryOb.properties.name;
    let node = await checkForNode(value, type);
    if(node.length > 0){
       console.log(value +' already exists');
       console.log(node)
       setProperties(queryOb);
       if(node[0].labels.includes(type)){
        console.log('already has label');
       }else{
        addLabel(queryOb);
       }
      
    }else{
     
        let prop = {};
       
        let propKeys = d3.keys(queryOb.properties);

        propKeys.forEach(el => {
            prop[el] = typeof queryOb.properties[el] === 'string' ? queryOb.properties[el] : JSON.stringify(queryOb.properties[el]);
        });

        prop.name = queryOb.name;
        prop.type = queryOb.type;

        let command = `CREATE (n:`+type+` $props)`;
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


export async function addNodeArray(obArray:Array<object>){
   console.log('in node array',obArray);
    let names: Array<string> = await obArray.map(v=> v.name);
    let type = obArray[0].type;

    let originalNodes : Array<string> = await checkForNodeArray(names);

    let originalNames = originalNodes.map(m=> m.properties.name);

    let addLabelArray = originalNodes.filter(o=> o.labels.indexOf(type) == -1);

    let newNames = names.filter(n=> originalNames.indexOf(n) == -1);

    if(newNames.length > 0){
     
        let newObs = obArray.filter(ob=> newNames.indexOf(ob.name) > -1)
        let newnew = newObs.map(o=> {
            let keys = d3.keys(o);
            keys.forEach(k=> {
             
                if(typeof o[k] != 'string'){
                    o[k] = JSON.stringify(o[k])
                }else if(typeof o[k] == 'object'){
                    o[k] = JSON.stringify(Promise.resolve(o[k]))
                }else{console.log('whaaa')}
            })
            return o;
        });
        
        let command = 'UNWIND $props AS map CREATE (n:'+type+') SET n = map'
   
        var session = driver.session();
        session
            .run(command, {props: newnew})
            .then(function(result) {
                session.close();

            console.log("adding to graph");
            })
            .catch(function(error:any) {
                console.log(error);
            });

        }else{ console.log('ALREADY THERE')}

}

export async function structureRelation(node1: Array<object>, node2: Array<object>, relation:string){
   
    let node1Label = node1[0].type ? node1[0].type : node1[0].label;
    let node2Label = node2[0].type ? node2[0].type : node2[0].label;

    let phenoNames = node1.map(p=> p.name.toString());
    let relationArr = []
    let relatedPhenotypes = node2.map(p=>{
        
            let varProps = typeof p.properties == 'string'? JSON.parse(p.properties) : p.properties;
            varProps = varProps.properties? varProps.properties : varProps;
            varProps = typeof varProps == 'string'? JSON.parse(varProps) : varProps;
       
            let phenoFromVars = varProps.Phenotypes.map(p=> {
                let omimCheck = p.map(dis=> dis.disease_ids.filter(d=> d.organization == "OMIM"));
                return omimCheck;
            });

            let filtered = phenoFromVars.flatMap(fil=>{ 
                return fil.filter(test=> test.length > 0);
            }).flatMap(d=> d);

        
            filtered.forEach(fil=> {
                let index = phenoNames.indexOf(fil.accession)
               
                if(index > -1){ relationArr.push({'pheno': fil.accession, 'variant': p.name}) }
            })
    });
    relationArr.forEach(rel => {
    addRelation(rel.pheno, 'Phenotype', rel.variant, 'Variant', relation);
    });
}

export async function addToGraph(query:string, type:string) {
    let command = 'CREATE (n:' + type + ' {name:"' + query + '"})';
 
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
   // let command = 'MATCH (n:'+type+' { symbol: "' + name + '" }) RETURN n';

    let command = 'MATCH (n { name: "' + name + '" }) RETURN n';

    return session
        .run(command)
        .then(function(result:any) {
            session.close();
         
            let resultArray = result.records.map(res => {
                return res.get('n');
            });
            return resultArray;
         
        })
        .catch(function(error:any) {
            console.log(error);
        });
}

export async function checkForNodeArray(names:Array<string>) {
    let command = 'UNWIND $vars as val MATCH (n {name: val}) RETURN n'
    var session = driver.session();
    
    return session
        .run(command, {vars: names})
        .then(function(result) {
            session.close();
            let resultArray = result.records.map(res => {
                return res.get('n');
            });
            return resultArray;
        })
        .catch(function(error:any) {
            console.log(error);
        });
}


export async function getGraph() {

    let command = 'match (n)-[r]-()\
    return collect(distinct n) as nodes, collect(distinct r) as rels'

    var session = driver.session();

    return session
        .run(command)
        .then(async function(result) {
    
            return await result.records.map(r=> {
           
              let nodes = r.get('nodes').map(n=> {
                let node = new Object();
                node.index = n.identity.low;
                node.name = n.properties.name;
                node.properties = n.properties;
                node.label = n.labels;
                return node;
              });

              let rels = r.get('rels').map(m=> {
                let meh = new Object();
                meh.start = m.start.low;
                meh.end = m.end.low;
                meh.index = m.identity.low;
                meh.type = m.type;
                return meh;
              });

              let indexArray = nodes.map(n=> n.index);
              let rela = rels.map(r=> {
                    var source = indexArray.indexOf(r.start);
                    var target = indexArray.indexOf(r.end);
                    return {'source': nodes[source].name, 'target': nodes[target].name}
                })

                let nameArr = nodes.map(d=> d.name)
          
                let relInd = rela.map(v=>{
                    return {'source': nameArr.indexOf(v.source), 'target': nameArr.indexOf(v.target) }
                });

                session.close();
                return {nodes: nodes, links: relInd };  
               
        });
    })   
        .catch(function(error) {
            console.log(error);
        });

}

export async function addRelation(sourceName:string, sourceType:string, targetName:string, targetType:string, linkType:string) {
    
    let command = 'MATCH (a:'+sourceType+'),(b:'+targetType+') \
    WHERE a.name = "' + sourceName + '" AND b.name = "' + targetName + '" MERGE (a)-[r:'+linkType+']->(b) ON CREATE SET r.alreadyExisted=false ON MATCH SET r.alreadyExisted=true RETURN r.alreadyExisted';

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


export async function buildSubGraph(geneNode: object){
    
    console.log(geneNode.name+' in build subgraph', geneNode);

    
    await addNode(geneNode, geneNode.type);
      //VARIANTS
      
    let varObs = geneNode.properties.Variants;
  
    if(varObs != undefined){
        addNodeArray(varObs).then(()=> {
            varObs.forEach(v=>{
                addRelation(v.name, v.type, geneNode.name, geneNode.type, 'Mutation');
            });
      })
    }

      
      //PHENOTYPES
    
    let phenObs = geneNode.properties.Phenotypes;

    if(phenObs.nodes != undefined){
        addNodeArray(phenObs.nodes).then(()=> { 
            //Phenotype varriant relations
         structureRelation(phenObs.nodes, varObs, "Pheno");
     })
    }
    
  
      let interactors = geneNode.properties.InteractionPartners;
      console.log(interactors);

  if(interactors != undefined){
    addNodeArray(interactors).then(()=> {
        interactors.forEach(rel => {
            addRelation(rel.name, 'Interaction', geneNode.name, 'Gene', 'Interacts');
        });
    })
  }

  
  }