import "./styles.scss";
import * as d3 from 'D3';
import { QueryObject, VariantObject } from "./queryObject";
import { searchOMIM } from "./search";
const gCanvas = require('./graphRender');
var neoAPI = require('./neo4jLoader');
var search = require('./search');
var dataLoad = require('./fileDataLoad');
const qo = require('./queryObject');
import ky from 'ky';

let canvas = d3.select('#graph-render').append('svg').classed('graph-canvas', true);
let linkGroup = canvas.append('g').classed('links', true);
let nodeGroup = canvas.append('g').classed('nodes', true);
let toolDiv = d3.select('body').append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
let queryPanel = d3.select('#wrapper').append('div').attr('id', 'query-panel');

dataLoad.loadFile().then(async (d)=> {
    console.log('init data file', d);

    let geneOb = new qo.QueryObject(d[0].key);
    geneOb.type = "Gene";

    let varsFromFile = d[0].values.map(v=> {
        let variant = new qo.VariantObject(v.id);
        variant.type = "Variant";
        Object.keys(v).map(key=> {
            variant.properties[key.toString()] = v[key];
            variant.properties.associatedGene = d[0].key;
            variant.properties.description = variant.name;
            variant.properties.Ids.dbSnp = v.id;
        });
        return variant
    });

    let graph = await neoAPI.getGraph();//.then(g => {

    if(graph != undefined){

        let variants = graph[0].nodes.filter(d=> d.label == 'Variant');
        let variantNames = variants.map(v=> v.name);
        let newVars = varsFromFile.filter(v=> variantNames.indexOf(v.name) == -1);
        console.log(newVars);

        let geneNode = await isStored(graph[0], 'GJB2', 'Gene', geneOb)//.then(async (nodeO)=> {
        
        if(newVars.length > 0){
            console.log('checking var node properties', geneNode.properties)
            let varArray = typeof geneNode.properties.Variants == 'string'? JSON.parse(geneNode.properties.Variants) : geneNode.properties.Variants;
            //let vars = await qo.structVariants(newVars);
            newVars.forEach(v=> varArray.push(v))
       
            geneNode.properties.Variants = varArray;
            let updatedVar = await qo.structVariants(geneNode);
            console.log(updatedVar);
            neoAPI.addNodeArray(updatedVar);
        }

        if(variants.length == 0){
            let vars = await qo.structVariants(geneNode);
            neoAPI.addNodeArray(vars);
        }

        neoAPI.addNode(geneNode, 'Gene');
        
        gCanvas.drawGraph(graph);

        let phenotypes = graph[0].nodes.filter(d=> d.label == 'Phenotype');
                if(phenotypes.length == 0){
                    let pheno = await qo.structPheno(geneNode);
                    neoAPI.addNodeArray(pheno);
                    neoAPI.structureRelation(pheno, variants, "Pheno");

                }else{
                    neoAPI.structureRelation(phenotypes, variants, "Pheno");
                }
                nodeO.properties.Variants = qo.structVariants(nodeO);
   
                gCanvas.renderCalls(nodeO);
                gCanvas.renderGeneDetail(nodeO);
           // });

        }else{
         
            initialSearch(geneOb).then(async n=> {
            
                let varAlleles = n.properties.Variants.map(v=> {
                    let name = v.id? v.id : v.dbSnps;
                    let variant = new qo.VariantObject(name);
                    variant.type = "Variant";
                    Object.keys(v).map(key=> {
                        variant.properties[key.toString()] = v[key];
                        variant.properties.associatedGene = d[0].key;
                        variant.properties.description = variant.name;
                        variant.properties.Ids.dbSnp = name;
                    });
                    return variant
                });
               
                /*
name: "rs35887622"
properties:
Ids: {dpSnp: "rs35887622"}
Location: {}
Name: {}
Phenotypes: {}
Structure: {}
Text: {}
associatedGene: "GJB2"
clinvarAccessions: "RCV000018523;;;RCV000168670;;;RCV000211758;;;RCV000678866;;;RCV000355109;;;RCV000300311;;;RCV000324780;;;RCV000379337;;;RCV000260287;;;RCV000080364;;;RCV000487479"
dbSnps: "rs35887622"
description: "rs35887622"
mimNumber: 121011
mutations: "GJB2, MET34THR"
name: "RECLASSIFIED - VARIANT OF UNKNOWN SIGNIFICANCE"
number: 1
status: "live"
text: */
                let variantNames = varAlleles.map(v=> v.name);
                console.log(variantNames)
                let newVars = varsFromFile.filter(v=> {
                    return variantNames.indexOf(v.properties.Ids.dbSnp) == -1
                });
               
                if(newVars.length > 0){
                    console.log(newVars.length)
                    newVars.forEach(v=> varAlleles.push(v));
                }

                let structuredVars = await qo.structVariants(varAlleles);
                console.log(structuredVars);

                n.properties.Variants = structuredVars;
                neoAPI.addNode(n, n.type);
                neoAPI.addNodeArray(n.properties.Variants).then(async ()=> {
                    n.properties.Variants.forEach(v=>{
                        neoAPI.addRelation(v.name, v.type, n.value, n.type, 'Mutation');
                    });

                n.properties.Phenotypes.nodes = await qo.structPheno(n);

                neoAPI.addNodeArray(n.properties.Phenotypes.nodes);
                  
                let varNames = n.properties.Variants.map(v=> {
                    let des = typeof v.properties == 'string'? JSON.parse(v.properties) : v.properties;
                    return des.description.toString()
                });
             
                let relatedPhenotypes = n.properties.Phenotypes.nodes.map(p=>{
                        let pindex = varNames.indexOf(p.properties.description.toString().toUpperCase())
                        if(pindex > -1 ){
                            p.varIds = n.properties.Variants[pindex].name;
                        }else{
                            p.varIds = null;
                        }
                        return p;
                    }).filter(p=> p.varIds != null);

                    relatedPhenotypes.forEach(rel => {
                        neoAPI.addRelation(rel.name, 'Phenotype', rel.varIds, 'Variant', 'Pheno');
                });

/*
Ids: {dpSnp: "rs80338940"}
Location: {}
Name: {}
Phenotypes: {}
Structure: {}
Text: {}
associatedGene: "GJB2"
description: "rs80338940"
gene: "GJB2"
id: "rs80338940"
__proto__: Object
type: "Variant"*/


/*
                qo.structVariants(n).then(async (vars)=> {
                    n.properties.Variants = vars;
                    neoAPI.addNode(n, n.type);
                    neoAPI.addNodeArray(n.properties.Variants).then(async ()=> {
                        n.properties.Variants.forEach(v=>{
                            neoAPI.addRelation(v.name, v.type, n.value, n.type, 'Mutation');
                        });

                    n.properties.Phenotypes.nodes = await qo.structPheno(n);

                    neoAPI.addNodeArray(n.properties.Phenotypes.nodes);
                      
                    let varNames = n.properties.Variants.map(v=> {
                        let des = typeof v.properties == 'string'? JSON.parse(v.properties) : v.properties;
                        return des.description.toString()
                    });
                 
                    let relatedPhenotypes = n.properties.Phenotypes.nodes.map(p=>{
                            let pindex = varNames.indexOf(p.properties.description.toString().toUpperCase())
                            if(pindex > -1 ){
                                p.varIds = n.properties.Variants[pindex].name;
                            }else{
                                p.varIds = null;
                            }
                            return p;
                        }).filter(p=> p.varIds != null);

                        relatedPhenotypes.forEach(rel => {
                            neoAPI.addRelation(rel.name, 'Phenotype', rel.varIds, 'Variant', 'Pheno');
                    });

                });*/

            });
    
    })

    }
//})

async function initialSearch(queryOb: object){
   
    let idSearch = await search.searchBySymbol(queryOb);
    let mimId = await search.geneIdtoMim(idSearch);
    let omimOb = await searchOMIM(mimId);
    let kegg = await search.getKegg(omimOb.properties.Ids.ncbi, omimOb);
   
    return kegg;
}

async function isStored(graph: object, nameSearch:string, nodeType:string, data:object){
    let foundGraphNodes = graph.nodes.filter(n=> n.properties.symbol == nameSearch);
    let nodeOb = foundGraphNodes.length > 0 ? foundGraphNodes[0] : initialSearch(data);
 
    return nodeOb
}

});