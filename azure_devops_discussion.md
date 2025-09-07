# Azure DevOps CI/CD Setup for QuantumXfer

## 🚀 Azure DevOps CI/CD Setup

### **Prerequisites:**
1. **Azure DevOps Organization**: Create one at [dev.azure.com](https://dev.azure.com)
2. **GitHub Integration**: Connect your quantumxfer repository
3. **Agent Pools**: Use Microsoft-hosted agents for cross-platform builds

### **Step 1: Create Azure DevOps Pipeline**

Create a new file: `.azure-pipelines/azure-pipelines.yml`

```yaml
# Azure DevOps Pipeline for QuantumXfer
trigger:
  branches:
    include:
    - main
  tags:
    include:
    - v*

pr:
  branches:
    include:
    - main

pool:
  vmImage: 'ubuntu-latest'

stages:
- stage: Test
  displayName: 'Run Tests'
  jobs:
  - job: Test
    displayName: 'Test on Ubuntu'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '18.x'
      displayName: 'Install Node.js'
    
    - script: npm ci
      displayName: 'Install dependencies'
    
    - script: npm run lint
      displayName: 'Run linting'
    
    - script: npm test
      displayName: 'Run tests'
    
    - script: npm run build
      displayName: 'Build application'

- stage: Build
  displayName: 'Build Applications'
  dependsOn: Test
  condition: succeeded()
  jobs:
  - job: Build_Windows
    displayName: 'Build Windows'
    pool:
      vmImage: 'windows-latest'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '18.x'
      displayName: 'Install Node.js'
    
    - script: npm ci
      displayName: 'Install dependencies'
    
    - script: npm run build
      displayName: 'Build application'
    
    - script: npm run electron:build -- --win
      displayName: 'Build Electron Windows'
    
    - task: PublishBuildArtifacts@1
      inputs:
        pathtoPublish: 'dist-electron'
        artifactName: 'quantumxfer-windows'
      displayName: 'Publish Windows artifacts'

  - job: Build_Linux
    displayName: 'Build Linux'
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '18.x'
      displayName: 'Install Node.js'
    
    - script: npm ci
      displayName: 'Install dependencies'
    
    - script: npm run build
      displayName: 'Build application'
    
    - script: npm run electron:build -- --linux
      displayName: 'Build Electron Linux'
    
    - task: PublishBuildArtifacts@1
      inputs:
        pathtoPublish: 'dist-electron'
        artifactName: 'quantumxfer-linux'
      displayName: 'Publish Linux artifacts'

  - job: Build_macOS
    displayName: 'Build macOS'
    pool:
      vmImage: 'macOS-latest'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '18.x'
      displayName: 'Install Node.js'
    
    - script: npm ci
      displayName: 'Install dependencies'
    
    - script: npm run build
      displayName: 'Build application'
    
    - script: npm run electron:build -- --mac
      displayName: 'Build Electron macOS'
    
    - task: PublishBuildArtifacts@1
      inputs:
        pathtoPublish: 'dist-electron'
        artifactName: 'quantumxfer-macos'
      displayName: 'Publish macOS artifacts'

- stage: Release
  displayName: 'Create Release'
  dependsOn: Build
  condition: and(succeeded(), startsWith(variables['Build.SourceBranch'], 'refs/tags/v'))
  jobs:
  - job: Release
    displayName: 'Create GitHub Release'
    steps:
    - task: DownloadBuildArtifacts@0
      displayName: 'Download all artifacts'
    
    - task: GitHubRelease@1
      inputs:
        gitHubConnection: 'quantumxfer-github'
        repositoryName: 'shavali-arc/quantumxfer'
        action: 'create'
        target: '$(Build.SourceVersion)'
        tagSource: 'gitTag'
        title: 'QuantumXfer $(Build.SourceBranchName)'
        assets: |
          $(System.ArtifactsDirectory)/quantumxfer-windows/*
          $(System.ArtifactsDirectory)/quantumxfer-linux/*
          $(System.ArtifactsDirectory)/quantumxfer-macos/*
        addChangeLog: true
        isPreRelease: false
      displayName: 'Create GitHub Release'
```

### **Step 2: Configure Azure DevOps**

1. **Create Project**: Go to Azure DevOps → New Project
2. **Connect Repository**: Project Settings → Service Connections → New → GitHub
3. **Create Pipeline**: Pipelines → New Pipeline → GitHub → Select your quantumxfer repo
4. **Configure Pipeline**: Use the YAML file above

### **Step 3: Set Up Service Connection**

In Azure DevOps:
1. Go to Project Settings → Service Connections
2. Create new GitHub service connection
3. Authorize access to your quantumxfer repository

### **Step 4: Environment Variables (Optional)**

For code signing or other secrets:
```yaml
variables:
- group: 'quantumxfer-secrets'
```

## 🎯 Benefits of Azure DevOps for QuantumXfer

### **Advantages over GitHub Actions:**
- **Better Windows Support**: Native Windows agents with better performance
- **Advanced Analytics**: Detailed build metrics and reporting
- **Enterprise Features**: Test plans, work item integration
- **Scalability**: Handle larger builds and more complex workflows
- **Integration**: Better integration with Azure services if needed

### **Comparison:**

| Feature | GitHub Actions | Azure DevOps |
|---------|---------------|--------------|
| **Cost** | Free for public repos | Free tier available |
| **Setup** | YAML in repo | YAML in repo |
| **Windows Builds** | Good | Excellent |
| **macOS Builds** | Good | Excellent |
| **Linux Builds** | Excellent | Excellent |
| **GitHub Integration** | Native | Via service connection |
| **UI/Dashboard** | Basic | Advanced |

## 🚀 Getting Started

1. **Create Azure DevOps account** at [dev.azure.com](https://dev.azure.com)
2. **Connect your GitHub repo** to Azure DevOps
3. **Create the pipeline** using the YAML above
4. **Run your first build** by pushing to main branch
5. **Create releases** by tagging commits (e.g., `git tag v1.2.0 && git push --tags`)

## 📋 Next Steps

1. **Test the pipeline** with a small change to trigger builds
2. **Configure notifications** for build status
3. **Set up branch policies** for pull requests
4. **Add automated testing** if you expand your test suite
5. **Configure artifact retention** policies

Azure DevOps will give you a robust, enterprise-grade CI/CD solution for your QuantumXfer project with excellent cross-platform build support! 🎉
