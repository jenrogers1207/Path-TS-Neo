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
  //  console.log('init data file', d);

    let geneOb = new qo.QueryObject(d[0].key);
    geneOb.type = "Gene";


    let fileVariants = await variantObjectMaker(d[0].values);
    let graph = await neoAPI.getGraph();//.then(g => {

    if(graph != undefined){

        let graphVariants = graph[0].nodes.filter(d=> d.label == 'Variant');
      
        
        let geneNode = await isStored(graph[0], 'GJB2', 'Gene', geneOb)//.then(async (nodeO)=> {

        console.log('isthishitting?', JSON.parse(geneNode.properties.Variants))
   // let variants = graphVariants.length > 0 ? updateVariants(fileVariants, graphVariants): variantObjectMaker(JSON.parse(geneNode.properties.Variants));
    
        let variants = updateVariants(fileVariants, graphVariants)

        console.log(variants);
        let variantOb = await Promise.resolve(variants);

        variantOb.forEach(v=>{
                neoAPI.addRelation(v.name, v.type, geneOb.name, geneOb.type, 'Mutation');
            });
        
        gCanvas.drawGraph(graph);

        let graphPhenotypes = graph[0].nodes.filter(d=> d.label == 'Phenotype');
        let phenotypes = graphPhenotypes.length > 0? graphPhenotypes :await qo.structPheno(geneNode.properties.Phenotypes, geneNode.name);

        console.log('pheno?', phenotypes);
        console.log('graphvar?', graphVariants);

      //  let structuredPheno = await qo.structPheno(geneNode.properties.Phenotypes, gene.name);
      //  n.properties.Phenotypes.nodes = structuredPheno;
       // console.log('structured pheno!', structuredPheno);
        neoAPI.addNodeArray(phenotypes).then(()=> neoAPI.structureRelation(phenotypes, graphVariants, "Pheno"));

    
        gCanvas.renderCalls(geneOb);
        gCanvas.renderGeneDetail(geneOb);
  
        }else{
            console.groupCollapsed('graph did not load');
            initialSearch(geneOb).then(async n=> {
               
                let varAlleles = await variantObjectMaker(n.properties.Variants);
              
                let variants = await updateVariants(fileVariants, varAlleles);
                console.log('var alleles from graph not loading', variants);
       
                //let structuredVars = await qo.structVariants(variants);
         
                n.properties.Variants = variants;
            
                neoAPI.addNode(n, n.type);

                neoAPI.addNodeArray(variants).then(async ()=> {
                    variants.forEach(v=>{
                        neoAPI.addRelation(v.name, v.type, n.name, n.type, 'Mutation');
                    });
                
                let structuredPheno = await qo.structPheno(n.properties.Phenotypes, n.name);
                n.properties.Phenotypes.nodes = structuredPheno;
                console.log('structured pheno!', structuredPheno);

                neoAPI.addNodeArray(structuredPheno);
                  
                let varNames = variants.map(v=> {
                    let des = typeof v.properties == 'string'? JSON.parse(v.properties) : v.properties;
                    console.log(des.description)
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

async function variantObjectMaker(varArray: Array<object>){
  
   let varObs = typeof varArray == 'string'? JSON.parse(varArray): varArray;
    return varObs.map(v=> {
        let name = v.id? v.id : v.dbSnps;
        let variant = new qo.VariantObject(name);
        variant.type = "Variant";
        let keys = v.properties? Object.keys(v.properties) : Object.keys(v);
     
        keys.map(key=> {
            variant.properties[key.toString()] = v[key];
            variant.properties.associatedGene = d[0].key;
            variant.properties.description = variant.name;
            variant.properties.Ids.dbSnp = name;
        });
        return variant
    });
}

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

async function updateVariants(fileVarArr:Array<Object>, graphVarArr: Array<any>){
   
    let graphVars = typeof graphVarArr == 'string'? JSON.parse(graphVarArr) : graphVarArr;
    let variantNames = graphVars.map(v=> v.name);
    let newVars = fileVarArr.filter(v=> variantNames.indexOf(v.name) == -1);
    return addIn(newVars, graphVars);
        
        
    async function addIn(newArray:Array<Object>, oldArray:Array<Object>){
        if(newArray.length > 0){ newArray.forEach(v=> oldArray.push(v)) }
        console.log(oldArray);
        return qo.structVariants(oldArray);
    }

}

});